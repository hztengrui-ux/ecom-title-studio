import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import {
  PLATFORMS,
  STRATEGIES,
  listPlatforms,
  resolvePlatformIds,
  resolveStrategyIds,
} from './lib/platforms.mjs';
import { buildDemoRaw, listSamples } from './lib/demo.mjs';
import { normalizeResult } from './lib/normalize.mjs';
import { buildBatchWorkbook } from './lib/batch-export.mjs';
import { VisionError, callVision, testConnection } from './lib/vision.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const VERSION = '1.1.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function environmentConfigured() {
  const baseUrl = process.env.VISION_BASE_URL || '';
  const model = process.env.VISION_MODEL || '';
  if (!baseUrl && !model) return false;
  if (process.env.VISION_API_KEY) return true;
  if (process.env.VISION_PROVIDER === 'ollama') return true;
  try {
    const hostname = new URL(baseUrl).hostname;
    return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
}

function securityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    ...extra,
  };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...securityHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
    }),
  });
  res.end(body);
}

function redactSensitive(value) {
  return String(value || '')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, 'sk-***')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1***');
}

function sendError(res, status, code, message, detail = '') {
  sendJson(res, status, {
    ok: false,
    error: {
      code,
      message,
      ...(detail ? { detail: redactSensitive(detail).slice(0, 800) } : {}),
    },
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        const error = new Error('请求体过大');
        error.status = 413;
        error.code = 'BODY_TOO_LARGE';
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        const error = new Error('请求体不是合法 JSON');
        error.status = 400;
        error.code = 'BAD_JSON';
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function normalizeBrief(input) {
  const brief = input && typeof input === 'object' ? input : {};
  const clean = (value, limit) =>
    String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  return {
    category: clean(brief.category, 40),
    brand: clean(brief.brand, 30),
    sellingPoints: clean(brief.sellingPoints || brief.selling_points, 300),
    audience: clean(brief.audience, 100),
  };
}

function validateImage(image) {
  if (typeof image !== 'string' || !image.startsWith('data:image/')) {
    throw new VisionError(400, 'IMAGE_REQUIRED', '请先上传一张商品图');
  }
  if (!/^data:image\/(?:jpeg|png|webp);base64,/iu.test(image)) {
    throw new VisionError(400, 'IMAGE_FORMAT', '只支持 JPEG、PNG 或 WebP 图片');
  }
  const base64 = image.split(',', 2)[1] || '';
  const bytes = Buffer.byteLength(base64, 'base64');
  if (!bytes) throw new VisionError(400, 'IMAGE_EMPTY', '图片内容为空');
  if (bytes > MAX_IMAGE_BYTES) {
    throw new VisionError(413, 'IMAGE_TOO_LARGE', '图片超过 8MB，请压缩后再试');
  }
  return image;
}

async function handleDemo(body) {
  const platforms = resolvePlatformIds(body.platforms);
  const strategies = resolveStrategyIds(body.strategies);
  const raw = buildDemoRaw({
    sampleId: body.sampleId || body.sample_id,
    platforms,
    strategies,
  });
  return normalizeResult(raw, {
    platforms,
    strategies,
    // 内置示例是商品图，按商品标题展示；真实图片仍遵循用户的素材模式。
    rules: {
      ...(body.rules || {}),
      assetMode: false,
      targetCategory: 'custom',
      targetCategoryLabel: '内置示例',
    },
    model: '内置示例',
    demo: true,
    demoNote: raw.demo_note,
    demoSample: raw.demo_sample,
    elapsedMs: 0,
  });
}

async function handleAnalyze(body) {
  const image = validateImage(body.image);
  const platforms = resolvePlatformIds(body.platforms);
  const strategies = resolveStrategyIds(body.strategies);
  const brief = normalizeBrief(body.brief);
  const { raw, meta } = await callVision({
    image,
    brief,
    platforms,
    strategies,
    rules: body.rules,
    settings: body.settings || {},
  });
  return normalizeResult(raw, {
    platforms,
    strategies,
    rules: body.rules,
    model: meta.model,
    elapsedMs: meta.elapsedMs,
    usage: meta.usage,
  });
}

function staticPathFor(publicDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  let relative = decoded.replace(/^\/+/u, '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const full = path.resolve(publicDir, relative);
  const root = path.resolve(publicDir);
  const normalizedRoot = root.toLowerCase();
  const normalizedFull = full.toLowerCase();
  if (normalizedFull !== normalizedRoot && !normalizedFull.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }
  return full;
}

async function serveStatic(req, res, publicDir, pathname) {
  const filePath = staticPathFor(publicDir, pathname);
  if (!filePath) {
    sendError(res, 403, 'FORBIDDEN', '无权访问该路径');
    return;
  }
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    if (req.headers.accept?.includes('text/html')) {
      const fallback = path.join(publicDir, 'index.html');
      try {
        const html = await fsp.readFile(fallback);
        res.writeHead(200, {
          ...securityHeaders({
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': html.length,
            'Cache-Control': 'no-cache',
          }),
        });
        res.end(html);
        return;
      } catch {
        // fall through
      }
    }
    sendError(res, 404, 'NOT_FOUND', '页面不存在');
    return;
  }
  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    try {
      stat = await fsp.stat(indexPath);
      return serveFile(req, res, indexPath, stat);
    } catch {
      sendError(res, 404, 'NOT_FOUND', '页面不存在');
      return;
    }
  }
  return serveFile(req, res, filePath, stat);
}

async function serveFile(req, res, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME_TYPES[ext] || 'application/octet-stream';
  const noCache = ['.html', '.css', '.js', '.mjs', '.json'].includes(ext);
  const headers = securityHeaders({
    'Content-Type': type,
    'Content-Length': stat.size,
    'Cache-Control': noCache ? 'no-cache' : 'public, max-age=3600',
  });
  if (req.method === 'HEAD') {
    res.writeHead(200, headers);
    res.end();
    return;
  }
  res.writeHead(200, headers);
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) sendError(res, 500, 'READ_ERROR', '读取文件失败');
    else res.destroy();
  });
  stream.pipe(res);
}

export function createHttpServer({ publicDir = DEFAULT_PUBLIC_DIR } = {}) {
  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
    const { pathname } = requestUrl;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        ...securityHeaders({
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }),
      });
      res.end();
      return;
    }

    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        name: 'ecom-title-studio',
        version: VERSION,
        envConfigured: environmentConfigured(),
        envModel: String(process.env.VISION_MODEL || ''),
        time: new Date().toISOString(),
      });
      return;
    }

    if (pathname === '/api/platforms' && req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        platforms: listPlatforms(),
        strategies: STRATEGIES,
        platformOrder: Object.keys(PLATFORMS),
      });
      return;
    }

    if (pathname === '/api/samples' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, samples: listSamples() });
      return;
    }

    if (pathname === '/api/demo' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const result = await handleDemo(body);
        sendJson(res, 200, { ok: true, result });
      } catch (error) {
        if (error instanceof VisionError) {
          sendError(res, error.status, error.code, error.message, error.detail);
        } else {
          console.error('[demo]', error?.message || error);
          sendError(res, 500, 'DEMO_FAILED', '演示数据生成失败');
        }
      }
      return;
    }

    if (pathname === '/api/analyze' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const result = await handleAnalyze(body);
        sendJson(res, 200, { ok: true, result });
      } catch (error) {
        if (error instanceof VisionError) {
          sendError(res, error.status, error.code, error.message, error.detail);
        } else {
          console.error('[analyze]', error?.message || error);
          sendError(res, 500, 'ANALYZE_FAILED', '生成失败，请重试');
        }
      }
      return;
    }

    if (pathname === '/api/export/xlsx' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const title = String(body.title || '跨多多标题工坊批量导出').slice(0, 80);
        const buffer = buildBatchWorkbook({ ...body, title });
        const encoded = encodeURIComponent(`${title}.xlsx`);
        res.writeHead(200, {
          ...securityHeaders({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Length': buffer.length,
            'Content-Disposition': `attachment; filename="title-studio.xlsx"; filename*=UTF-8''${encoded}`,
            'Cache-Control': 'no-store',
          }),
        });
        res.end(buffer);
      } catch (error) {
        console.error('[xlsx]', error?.message || error);
        sendError(res, 500, 'XLSX_FAILED', 'Excel 生成失败，请重试');
      }
      return;
    }

    if (pathname === '/api/test' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const result = await testConnection(body.settings || {});
        sendJson(res, 200, { ok: true, ...result });
      } catch (error) {
        if (error instanceof VisionError) {
          sendError(res, error.status, error.code, error.message, error.detail);
        } else {
          console.error('[test]', error?.message || error);
          sendError(res, 500, 'TEST_FAILED', '连通性测试失败');
        }
      }
      return;
    }

    if (pathname.startsWith('/api/')) {
      sendError(res, 404, 'API_NOT_FOUND', '接口不存在');
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendError(res, 405, 'METHOD_NOT_ALLOWED', '不支持的请求方法');
      return;
    }

    try {
      await serveStatic(req, res, publicDir, pathname);
    } catch (error) {
      console.error('[static]', error?.message || error);
      if (!res.headersSent) sendError(res, 500, 'SERVER_ERROR', '服务器内部错误');
      else res.destroy();
    }
  });
}

function openBrowser(url) {
  const command =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(command, { windowsHide: true }, () => {});
}

async function start() {
  const basePort = Number(process.env.PORT) || 8787;
  const wantOpen = process.argv.includes('--open');
  const publicDir = process.env.PUBLIC_DIR
    ? path.resolve(process.env.PUBLIC_DIR)
    : DEFAULT_PUBLIC_DIR;

  for (let port = basePort; port < basePort + 12; port += 1) {
    const server = createHttpServer({ publicDir });
    const started = await new Promise((resolve) => {
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE') resolve(null);
        else {
          console.error(error);
          resolve(null);
        }
      });
      server.listen(port, '127.0.0.1', () => resolve(server));
    });
    if (!started) continue;
    const url = `http://127.0.0.1:${port}`;
    console.log('');
    console.log('  跨多多标题工坊 · 电商标题识图生成');
    console.log(`  ${url}`);
    console.log(`  模型环境变量：${process.env.VISION_MODEL ? '已配置' : '未配置（可在页面右上角设置）'}`);
    console.log('  按 Ctrl+C 停止');
    console.log('');
    if (wantOpen) setTimeout(() => openBrowser(url), 350);
    return;
  }

  console.error(`端口 ${basePort}-${basePort + 11} 都被占用，请设置 PORT 环境变量后重试。`);
  process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

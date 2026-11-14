import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAdminPage } from './admin-ui.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.AUTH_DATA_DIR || path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
const UPDATE_FILE = process.env.AUTH_UPDATE_FILE || path.join(__dirname, 'update.json');
const DOWNLOAD_DIR = process.env.AUTH_DOWNLOAD_DIR || path.join(__dirname, 'download');
const PORT = Number(process.env.AUTH_PORT) || 8090;
const TOKEN_TTL_HOURS = Number(process.env.AUTH_TOKEN_TTL_HOURS) || 12;
const DEFAULT_DAYS = Number(process.env.AUTH_DEFAULT_DAYS) || 30;
// 一次性登录码有效期（分钟）
const LOGIN_CODE_TTL_MINUTES = Number(process.env.AUTH_LOGIN_CODE_TTL_MINUTES) || 10;
const ADMIN_TOKEN = String(process.env.AUTH_ADMIN_TOKEN || '').trim();

let accountsCache = null;
let accountsMtime = 0;
let secret = '';

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadSecret() {
  ensureDir();
  if (fs.existsSync(SECRET_FILE)) {
    secret = fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } else {
    secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  }
}

function readAccounts(force = false) {
  ensureDir();
  let mtime = 0;
  try { mtime = fs.statSync(ACCOUNTS_FILE).mtimeMs; } catch { mtime = 0; }
  if (!force && accountsCache && mtime === accountsMtime) return accountsCache;
  let data = { accounts: [] };
  try { data = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')); } catch { data = { accounts: [] }; }
  if (!Array.isArray(data.accounts)) data.accounts = [];
  accountsCache = data;
  accountsMtime = mtime;
  return data;
}

async function writeAccounts(data) {
  ensureDir();
  const tmp = `${ACCOUNTS_FILE}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fsp.rename(tmp, ACCOUNTS_FILE);
  accountsCache = data;
  try { accountsMtime = fs.statSync(ACCOUNTS_FILE).mtimeMs; } catch { accountsMtime = 0; }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function checkPassword(password, account) {
  try {
    const hash = crypto.scryptSync(String(password), account.salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(account.hash, 'hex'));
  } catch {
    return false;
  }
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

// 签发客户登录令牌（账号密码 / 一次性登录码共用）
function issueToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const token = signToken({
    sub: account.id,
    user: account.username,
    iat: now,
    exp: now + TOKEN_TTL_HOURS * 3600,
    jti: crypto.randomUUID(),
  });
  return {
    token,
    tokenExpiresAt: new Date((now + TOKEN_TTL_HOURS * 3600) * 1000).toISOString(),
    account: publicAccount(account),
  };
}

function newLoginCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function verifyToken(token) {
  const raw = String(token || '');
  const [body, sig] = raw.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!payload || typeof payload.sub !== 'string') return null;
  if (Number(payload.exp) * 1000 < Date.now()) return null;
  return payload;
}

function publicAccount(account) {
  const expiresAt = account.expiresAt || '';
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
    : null;
  return {
    id: account.id,
    username: account.username,
    name: account.name || account.username,
    role: account.role || 'user',
    expiresAt,
    daysLeft,
    disabled: Boolean(account.disabledAt),
  };
}

function findAccount(username) {
  const name = String(username || '').trim().toLowerCase();
  return readAccounts().accounts.find((item) => String(item.username).toLowerCase() === name) || null;
}

function accountBlockReason(account) {
  if (!account) return '账号不存在';
  if (account.disabledAt) return '账号已停用，请联系管理员';
  if (account.expiresAt && new Date(account.expiresAt).getTime() < Date.now()) return '授权已到期，请联系管理员续期';
  return '';
}

// ---- rate limit ----
const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 60_000);
  attempts.set(ip, list);
  return list.length >= 8;
}
function recordAttempt(ip) {
  const list = attempts.get(ip) || [];
  list.push(Date.now());
  attempts.set(ip, list);
}

// ---- http helpers ----
function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, limit = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

function bearer(req) {
  const value = String(req.headers.authorization || '');
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
}

function adminOk(req) {
  const given = String(req.headers['x-admin-token'] || '');
  if (ADMIN_TOKEN && given.length === ADMIN_TOKEN.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(given), Buffer.from(ADMIN_TOKEN))) return true;
    } catch {
      // 长度不一致时 timingSafeEqual 会抛错，按无效处理
    }
  }
  // 也允许 role=admin 的账号用登录令牌访问管理接口（管理员账号/手机号 + 密码登录）
  const payload = verifyToken(bearer(req));
  if (!payload) return false;
  const account = readAccounts().accounts.find((item) => item.id === payload.sub);
  return Boolean(account && account.role === 'admin' && !account.disabledAt);
}

function adminRoute(pathname) {
  return pathname.startsWith('/admin/');
}

async function handleAdmin(req, res, pathname, query) {
  if (!adminOk(req)) return json(res, 401, { ok: false, error: '管理员令牌无效' });
  const data = readAccounts(true);
  if (req.method === 'GET' && pathname === '/admin/accounts') {
    return json(res, 200, { ok: true, accounts: data.accounts.map(publicAccount) });
  }
  if (req.method === 'POST' && pathname === '/admin/accounts') {
    const body = await readBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!/^[A-Za-z0-9_.-]{2,32}$/.test(username)) return json(res, 400, { ok: false, error: '用户名需 2–32 位字母数字' });
    if (password.length < 6) return json(res, 400, { ok: false, error: '密码至少 6 位' });
    if (findAccount(username)) return json(res, 409, { ok: false, error: '用户名已存在' });
    const days = Number(body.days) || DEFAULT_DAYS;
    const { salt, hash } = hashPassword(password);
    const account = {
      id: crypto.randomUUID(),
      username,
      name: String(body.name || username).slice(0, 40),
      role: body.role === 'admin' ? 'admin' : 'user',
      salt,
      hash,
      note: String(body.note || '').slice(0, 200),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + Math.max(1, days) * 86400000).toISOString(),
      disabledAt: null,
    };
    data.accounts.push(account);
    await writeAccounts(data);
    return json(res, 200, { ok: true, account: publicAccount(account) });
  }
  const match = pathname.match(/^\/admin\/accounts\/([0-9a-fA-F-]{36})\/(disable|enable|reset|extend)$/);
  if (req.method === 'POST' && match) {
    const [, id, action] = match;
    const account = data.accounts.find((item) => item.id === id);
    if (!account) return json(res, 404, { ok: false, error: '账号不存在' });
    const body = await readBody(req);
    if (action === 'disable') account.disabledAt = new Date().toISOString();
    if (action === 'enable') account.disabledAt = null;
    if (action === 'reset') {
      const password = String(body.password || '');
      if (password.length < 6) return json(res, 400, { ok: false, error: '密码至少 6 位' });
      const { salt, hash } = hashPassword(password);
      account.salt = salt; account.hash = hash;
    }
    if (action === 'extend') {
      const days = Number(body.days) || DEFAULT_DAYS;
      const base = Math.max(Date.now(), new Date(account.expiresAt || 0).getTime());
      account.expiresAt = new Date(base + Math.max(1, days) * 86400000).toISOString();
    }
    await writeAccounts(data);
    return json(res, 200, { ok: true, account: publicAccount(account) });
  }
  const deleteMatch = pathname.match(/^\/admin\/accounts\/([0-9a-fA-F-]{36})\/delete$/);
  if (req.method === 'POST' && deleteMatch) {
    const index = data.accounts.findIndex((item) => item.id === deleteMatch[1]);
    if (index === -1) return json(res, 404, { ok: false, error: '账号不存在' });
    const target = data.accounts[index];
    if (target.role === 'admin') {
      const otherAdmins = data.accounts.filter((item) => item.role === 'admin' && item.id !== target.id);
      if (!otherAdmins.length) {
        return json(res, 400, { ok: false, error: '不能删除最后一个管理员账号' });
      }
    }
    data.accounts.splice(index, 1);
    await writeAccounts(data);
    return json(res, 200, { ok: true });
  }
  const updateMatch = pathname.match(/^\/admin\/accounts\/([0-9a-fA-F-]{36})\/update$/);
  if (req.method === 'POST' && updateMatch) {
    const account = data.accounts.find((item) => item.id === updateMatch[1]);
    if (!account) return json(res, 404, { ok: false, error: '账号不存在' });
    const body = await readBody(req);
    const nextUsername = String(body.username || '').trim();
    const nextPassword = String(body.password || '');
    if (nextUsername && nextUsername !== account.username) {
      if (!/^[A-Za-z0-9_.-]{2,32}$/.test(nextUsername)) {
        return json(res, 400, { ok: false, error: '账号需 2–32 位字母数字（手机号可直接填）' });
      }
      const conflict = data.accounts.some(
        (item) => item.id !== account.id && String(item.username).toLowerCase() === nextUsername.toLowerCase(),
      );
      if (conflict) return json(res, 409, { ok: false, error: '该账号/手机号已被占用' });
      account.username = nextUsername;
    }
    if (nextPassword) {
      if (nextPassword.length < 6) return json(res, 400, { ok: false, error: '密码至少 6 位' });
      const { salt, hash } = hashPassword(nextPassword);
      account.salt = salt;
      account.hash = hash;
    }
    await writeAccounts(data);
    return json(res, 200, { ok: true, account: publicAccount(account) });
  }
  const codeMatch = pathname.match(/^\/admin\/accounts\/([0-9a-fA-F-]{36})\/login-code$/);
  if (req.method === 'POST' && codeMatch) {
    const account = data.accounts.find((item) => item.id === codeMatch[1]);
    if (!account) return json(res, 404, { ok: false, error: '账号不存在' });
    const code = newLoginCode();
    const { salt, hash } = hashPassword(code);
    const expiresAt = new Date(Date.now() + LOGIN_CODE_TTL_MINUTES * 60000).toISOString();
    const now = Date.now();
    const kept = (Array.isArray(account.loginCodes) ? account.loginCodes : []).filter(
      (entry) => !entry.usedAt && new Date(entry.expiresAt).getTime() > now,
    );
    kept.push({ salt, hash, expiresAt, createdAt: new Date().toISOString(), usedAt: null });
    account.loginCodes = kept.slice(-5);
    await writeAccounts(data);
    return json(res, 200, {
      ok: true,
      code,
      expiresAt,
      ttlMinutes: LOGIN_CODE_TTL_MINUTES,
      account: publicAccount(account),
    });
  }
  return json(res, 404, { ok: false, error: '未知的管理接口' });
}

async function handleAuth(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/auth/login') {
    const ip = String(req.socket.remoteAddress || '');
    if (rateLimited(ip)) return json(res, 429, { ok: false, error: '尝试过于频繁，请 1 分钟后再试' });
    const body = await readBody(req);
    const account = findAccount(body.username);
    if (!account || !checkPassword(body.password, account)) {
      recordAttempt(ip);
      return json(res, 401, { ok: false, error: '用户名或密码错误' });
    }
    const block = accountBlockReason(account);
    if (block) return json(res, 403, { ok: false, error: block });
    return json(res, 200, { ok: true, ...issueToken(account) });
  }
  if (req.method === 'POST' && pathname === '/auth/login-code') {
    const ip = String(req.socket.remoteAddress || '');
    if (rateLimited(ip)) return json(res, 429, { ok: false, error: '尝试过于频繁，请 1 分钟后再试' });
    const body = await readBody(req);
    const code = String(body.code || '').replace(/\s+/g, '');
    const data = readAccounts(true);
    const account = data.accounts.find(
      (item) => String(item.username).toLowerCase() === String(body.username || '').trim().toLowerCase(),
    );
    if (!account || !/^\d{6}$/.test(code)) {
      recordAttempt(ip);
      return json(res, 401, { ok: false, error: '登录码不正确或已失效' });
    }
    const block = accountBlockReason(account);
    if (block) return json(res, 403, { ok: false, error: block });
    const now = Date.now();
    const codes = Array.isArray(account.loginCodes) ? account.loginCodes : [];
    const index = codes.findIndex(
      (entry) =>
        !entry.usedAt &&
        new Date(entry.expiresAt).getTime() > now &&
        checkPassword(code, entry),
    );
    if (index === -1) {
      recordAttempt(ip);
      return json(res, 401, { ok: false, error: '登录码不正确或已失效' });
    }
    codes[index].usedAt = new Date().toISOString();
    // 只保留未使用且在有效期内的登录码
    account.loginCodes = codes
      .filter((entry) => !entry.usedAt && new Date(entry.expiresAt).getTime() > now)
      .slice(-5);
    await writeAccounts(data);
    return json(res, 200, { ok: true, ...issueToken(account) });
  }
  if (req.method === 'GET' && pathname === '/auth/me') {
    const payload = verifyToken(bearer(req));
    if (!payload) return json(res, 401, { ok: false, error: '登录已失效，请重新登录' });
    const account = readAccounts(true).accounts.find((item) => item.id === payload.sub);
    const block = accountBlockReason(account);
    if (block) return json(res, 403, { ok: false, error: block });
    return json(res, 200, { ok: true, account: publicAccount(account) });
  }
if (req.method === 'GET' && pathname === '/update/latest') {
    let payload = { ok: true, version: '', notes: '', url: '', publishedAt: '' };
    try {
      payload = { ...payload, ...JSON.parse(fs.readFileSync(UPDATE_FILE, 'utf8')) };
    } catch {
      // 没有 update.json 时返回空版本，客户端视为无更新
    }
    return json(res, 200, payload);
  }
  if (req.method === 'GET' && pathname === '/health') {
    return json(res, 200, { ok: true, service: 'kuaduo-auth', time: new Date().toISOString() });
  }
  return json(res, 404, { ok: false, error: '未知接口' });
}

function listDownloads() {
  try {
    return fs
      .readdirSync(DOWNLOAD_DIR)
      .filter((name) => /^[\w.-]+\.(zip|exe)$/i.test(name))
      .map((name) => {
        const full = path.join(DOWNLOAD_DIR, name);
        const stat = fs.statSync(full);
        return { name, size: stat.size, mtime: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime));
  } catch {
    return [];
  }
}

function serveDownload(res, name) {
  if (!/^[\w.-]+\.(zip|exe)$/i.test(name)) return false;
  const full = path.join(DOWNLOAD_DIR, name);
  if (!fs.existsSync(full)) return false;
  const stat = fs.statSync(full);
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': stat.size,
    'Content-Disposition': 'attachment; filename="' + name + '"',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(full).pipe(res);
  return true;
}

export function createAuthServer() {
  loadSecret();
  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname.replace(/\/+$/, '') || '/';
      if (req.method === 'GET' && (pathname === '/' || pathname === '/admin')) {
        if (pathname === '/') {
          res.writeHead(302, { Location: '/admin', 'Cache-Control': 'no-store' });
          res.end();
          return;
        }
        const html = renderAdminPage();
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
        });
        res.end(html);
        return;
      }
      if (req.method === 'GET' && (pathname === '/download/list' || pathname === '/download')) {
        return json(res, 200, { ok: true, files: listDownloads() });
      }
      if (req.method === 'GET' && pathname.startsWith('/download/')) {
        const name = decodeURIComponent(pathname.slice('/download/'.length));
        if (serveDownload(res, name)) return;
        return json(res, 404, { ok: false, error: '文件不存在' });
      }
      if (adminRoute(pathname)) return await handleAdmin(req, res, pathname, url.searchParams);
      return await handleAuth(req, res, pathname);
    } catch (error) {
      return json(res, 400, { ok: false, error: error?.message || '请求失败' });
    }
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  loadSecret();
  const server = createAuthServer();
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[auth] listening http://127.0.0.1:${PORT}  data=${DATA_DIR}`);
    console.log(`[auth] admin token ${ADMIN_TOKEN ? '已配置' : '未配置（AUTH_ADMIN_TOKEN 为空，管理接口不可用）'}`);
  });
}



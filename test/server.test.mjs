import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createHttpServer } from '../server.mjs';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PzWvWQAAAABJRU5ErkJggg==';

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  server.closeAllConnections?.();
  server.close();
  await once(server, 'close');
}

function fakeUpstream() {
  const raw = {
    product: {
      name: '奶油白陶瓷马克杯',
      category: '家居 / 杯具',
      category_path: ['家居', '杯具'],
      summary: '奶油白釉面，带手柄。',
      attributes: [
        { name: '材质', value: '陶瓷' },
        { name: '容量', value: '350ml' },
      ],
      audience: ['办公室女性'],
      scenes: ['办公桌'],
      visible_text: [],
      confidence: 0.9,
    },
    selling_points: ['釉下彩', '微波炉可用'],
    keywords: {
      core: ['陶瓷马克杯', '咖啡杯'],
      long_tail: ['办公室水杯'],
      emotion: ['奶油风'],
    },
    keywords_en: {
      core: ['ceramic mug', 'coffee cup'],
      long_tail: ['office mug'],
      emotion: ['cozy'],
    },
    titles: [
      { platform: 'taobao', strategy: '流量型', text: '奶油白陶瓷马克杯办公室咖啡杯带手柄水杯', keywords: ['陶瓷马克杯'] },
      { platform: 'taobao', strategy: '转化型', text: '手作感釉下彩马克杯350ml微波炉可用咖啡杯', keywords: ['咖啡杯'] },
      { platform: 'taobao', strategy: '长尾型', text: '办公室下午茶奶油风陶瓷杯女生高颜值马克杯', keywords: ['办公室水杯'] },
      { platform: 'temu', strategy: '流量型', text: 'Cream Speckled Ceramic Mug 12 oz Coffee Cup with Handle' },
      { platform: 'temu', strategy: '转化型', text: 'Handmade Style Glazed Mug 350 ml Microwave Safe Coffee Cup' },
      { platform: 'temu', strategy: '长尾型', text: 'Cute Cream Coffee Mug for Office Desk Aesthetic Gift for Her' },
    ],
    compliance: { forbidden: [], notes: ['注意手作表述'] },
    image_quality: { score: 91, issues: ['补 45 度侧拍'] },
  };

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (req.url.endsWith('/models')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: 'fake-vision' }] }));
      return;
    }
    if (req.url.endsWith('/chat/completions')) {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (body.model !== 'fake-vision') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'wrong model' } }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(raw) } }],
          usage: { prompt_tokens: 100, completion_tokens: 200 },
        }),
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return server;
}

test('健康检查与平台配置', async () => {
  const app = createHttpServer();
  const base = await listen(app);
  try {
    const health = await fetch(`${base}/api/health`).then((res) => res.json());
    assert.equal(health.ok, true);
    assert.equal(health.name, 'ecom-title-studio');

    const platforms = await fetch(`${base}/api/platforms`).then((res) => res.json());
    assert.equal(platforms.ok, true);
    assert.ok(platforms.platforms.length >= 6);
    assert.ok(platforms.platforms.some((platform) => platform.id === 'temu'));
  } finally {
    await close(app);
  }
});

test('演示接口返回完整标题且不超平台上限', async () => {
  const app = createHttpServer();
  const base = await listen(app);
  try {
    const response = await fetch(`${base}/api/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: 'mug',
        platforms: ['taobao', 'temu'],
        strategies: ['flow', 'convert', 'longtail'],
      }),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.result.meta.demo, true);
    // 默认每平台 1 条：2 个平台 → 2 条
    assert.equal(data.result.titleCount, 2);
    assert.equal(data.result.titles.filter((title) => title.platform === 'taobao').length, 1);
    assert.equal(data.result.titles.filter((title) => title.platform === 'temu').length, 1);
    assert.equal(data.result.product.name, '奶油白手作感陶瓷马克杯');
    assert.ok(
      data.result.titles
        .filter((title) => title.platform === 'taobao')
        .every((title) => title.chars <= 30 && title.bytes <= 60),
    );
    assert.ok(
      data.result.titles
        .filter((title) => title.platform === 'temu')
        .every((title) => title.chars <= 120 && title.translation),
    );
  } finally {
    await close(app);
  }
});

test('批量模式每平台只返回 1 条标题', async () => {
  const app = createHttpServer();
  const base = await listen(app);
  try {
    const response = await fetch(`${base}/api/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: 'mug',
        platforms: ['taobao', 'temu'],
        strategies: ['flow', 'convert', 'longtail'],
        titlesPerPlatform: 1,
      }),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.result.titles.length, 2);
    assert.equal(data.result.titleCount, 2);
    assert.equal(data.result.titles.filter((title) => title.platform === 'taobao').length, 1);
    assert.equal(data.result.titles.filter((title) => title.platform === 'temu').length, 1);
  } finally {
    await close(app);
  }
});

test('缺图或未配置模型时返回可读错误', async () => {
  const app = createHttpServer();
  const base = await listen(app);
  try {
    const noImage = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms: ['taobao'] }),
    });
    assert.equal(noImage.status, 400);
    const noImageBody = await noImage.json();
    assert.equal(noImageBody.error.code, 'IMAGE_REQUIRED');

    const noConfig = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: TINY_PNG,
        platforms: ['taobao'],
        strategies: ['flow'],
        settings: { provider: 'custom', baseUrl: '', model: '', apiKey: '' },
      }),
    });
    assert.equal(noConfig.status, 400);
    const noConfigBody = await noConfig.json();
    assert.equal(noConfigBody.error.code, 'CONFIG_REQUIRED');
  } finally {
    await close(app);
  }
});

test('转发视觉模型并归一化结果', async () => {
  const upstream = fakeUpstream();
  const upstreamBase = await listen(upstream);
  const app = createHttpServer();
  const base = await listen(app);
  try {
    const response = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: TINY_PNG,
        brief: { category: '家居 / 杯具', sellingPoints: '釉下彩' },
        platforms: ['taobao', 'temu'],
        strategies: ['flow', 'convert', 'longtail'],
        settings: {
          provider: 'custom',
          baseUrl: `${upstreamBase}/v1`,
          model: 'fake-vision',
          apiKey: 'test-key',
        },
      }),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    // 默认每平台 1 条：2 个平台 → 2 条
    assert.equal(data.result.titleCount, 2);
    assert.equal(data.result.meta.model, 'fake-vision');
    assert.equal(data.result.meta.usage.completion_tokens, 200);
    assert.equal(data.result.overallScore > 0, true);
    assert.ok(data.result.compliance.notes.includes('注意手作表述'));
  } finally {
    await close(app);
    await close(upstream);
  }
});

test('连通性测试走 /models', async () => {
  const upstream = fakeUpstream();
  const upstreamBase = await listen(upstream);
  const app = createHttpServer();
  const base = await listen(app);
  try {
    const response = await fetch(`${base}/api/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          provider: 'custom',
          baseUrl: `${upstreamBase}/v1`,
          model: 'fake-vision',
          apiKey: 'test-key',
        },
      }),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.mode, 'models');
    assert.equal(data.modelFound, true);
  } finally {
    await close(app);
    await close(upstream);
  }
});

test('批量 Excel 接口返回有效 xlsx 文件', async () => {
  const app = createHttpServer();
  const base = await listen(app);
  try {
    const demoResponse = await fetch(`${base}/api/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleId: 'mug',
        platforms: ['taobao', 'temu'],
        strategies: ['flow', 'convert'],
      }),
    });
    const demo = await demoResponse.json();
    assert.ok(demo.result.description.text.length >= 60);

    const response = await fetch(`${base}/api/export/xlsx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '测试批量导出',
        platforms: ['taobao', 'temu'],
        rules: { titleMaxZh: 30, descriptionMax: 120 },
        items: [
          { name: 'mug.svg', status: 'done', result: demo.result, finishedAt: Date.now() },
        ],
      }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /spreadsheetml/);
    const buffer = Buffer.from(await response.arrayBuffer());
    assert.ok(buffer.length > 2000);
    assert.equal(buffer.subarray(0, 2).toString('utf8'), 'PK');
  } finally {
    await close(app);
  }
});

test('上游 200 空 content 时会自动重试并返回完整结果', async () => {
  let attempts = 0;
  const upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    attempts += 1;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (body.response_format) {
      res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '' } }] }));
      return;
    }
    res.end(JSON.stringify({
      choices: [{
        finish_reason: 'stop',
        message: {
          content: JSON.stringify({
            product: { name: 'Mock 陶瓷马克杯', category: '家居 / 杯具' },
            description: '奶油白陶瓷杯，办公室咖啡杯，带手柄，350ml 容量，适合日常饮水。',
            keywords: { core: ['陶瓷马克杯', '咖啡杯'], long_tail: ['办公室水杯'] },
            titles: [
              { platform: 'taobao', strategy: '流量型', text: '奶油白陶瓷马克杯办公室咖啡杯带手柄水杯' },
              { platform: 'temu', strategy: '流量型', text: 'Cream Ceramic Mug with Handle for Office Coffee' },
            ],
          }),
        },
      }],
    }));
  });
  const upstreamBase = await listen(upstream);
  const app = createHttpServer();
  const base = await listen(app);
  try {
    const response = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: TINY_PNG,
        brief: {},
        platforms: ['taobao', 'temu'],
        strategies: ['flow'],
        settings: {
          baseUrl: `${upstreamBase}/v1`,
          model: 'mock-vision',
          apiKey: 'test-key',
        },
      }),
    });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.ok(data.result.titles.length >= 2);
    assert.equal(attempts, 2);
  } finally {
    await close(app);
    await close(upstream);
  }
});

test('静态目录穿越被拒绝', async () => {
  const app = createHttpServer();
  const base = await listen(app);
  try {
    const response = await fetch(`${base}/%2e%2e%2fserver.mjs`);
    assert.notEqual(response.status, 200);
  } finally {
    await close(app);
  }
});

function fakeAuthUpstream() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const send = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };
    if (url.pathname === '/auth/login' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const { username, password } = JSON.parse(body || '{}');
        if (username !== 'client01' || password !== 'bg2Htg6eHG') {
          send(401, { ok: false, error: '用户名或密码错误' });
          return;
        }
        send(200, {
          ok: true,
          token: 'tok-client01',
          tokenExpiresAt: '2026-11-14T01:54:41.000Z',
          account: {
            id: 'acc-1',
            username: 'client01',
            name: '客户一号',
            role: 'user',
            expiresAt: '2026-12-13T13:49:37.446Z',
            daysLeft: 30,
            disabled: false,
          },
        });
      });
      return;
    }
    if (url.pathname === '/auth/me' && req.method === 'GET') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (token !== 'tok-client01') {
        send(403, { ok: false, error: '账号已停用' });
        return;
      }
      send(200, {
        ok: true,
        account: {
          id: 'acc-1',
          username: 'client01',
          name: '客户一号',
          role: 'user',
          expiresAt: '2026-12-13T13:49:37.446Z',
          daysLeft: 30,
          disabled: false,
        },
      });
      return;
    }
    send(404, { ok: false, error: '未知接口' });
  });
}

test('在线账号登录代理：成功与失败', async () => {
  const upstream = fakeAuthUpstream();
  const upstreamBase = await listen(upstream);
  const app = createHttpServer({ authBase: upstreamBase });
  const base = await listen(app);
  try {
    const ok = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client01', password: 'bg2Htg6eHG' }),
    });
    const okData = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(okData.ok, true);
    assert.equal(okData.token, 'tok-client01');
    assert.equal(okData.account.username, 'client01');

    const bad = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client01', password: 'wrong' }),
    });
    const badData = await bad.json();
    assert.equal(bad.status, 401);
    assert.equal(badData.ok, false);
    assert.match(badData.error.message, /密码错误/);
  } finally {
    await close(app);
    await close(upstream);
  }
});

test('在线账号校验代理：可用 / 停用 / 缺令牌', async () => {
  const upstream = fakeAuthUpstream();
  const upstreamBase = await listen(upstream);
  const app = createHttpServer({ authBase: upstreamBase });
  const base = await listen(app);
  try {
    const me = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: 'Bearer tok-client01' },
    });
    const meData = await me.json();
    assert.equal(me.status, 200);
    assert.equal(meData.account.daysLeft, 30);

    const disabled = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: 'Bearer expired-token' },
    });
    const disabledData = await disabled.json();
    assert.equal(disabled.status, 403);
    assert.match(disabledData.error.message, /停用/);

    const missing = await fetch(`${base}/api/auth/me`);
    assert.equal(missing.status, 401);
  } finally {
    await close(app);
    await close(upstream);
  }
});

test('授权服务地址配置接口', async () => {
  const app = createHttpServer({ authBase: 'https://api.kuaduoduo.vip' });
  const base = await listen(app);
  try {
    const response = await fetch(`${base}/api/auth/config`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.baseUrl, 'https://api.kuaduoduo.vip');
  } finally {
    await close(app);
  }
});

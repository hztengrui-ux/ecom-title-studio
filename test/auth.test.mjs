import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kuaduo-auth-'));
process.env.AUTH_DATA_DIR = dataDir;
process.env.AUTH_ADMIN_TOKEN = 'test-admin-token';
process.env.AUTH_DEFAULT_DAYS = '30';

const { createAuthServer } = await import('../auth-server/server.mjs');

async function withServer(fn) {
  const server = createAuthServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function admin(base, method, url, body = {}) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': 'test-admin-token' },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

test('健康检查可用', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
  });
});

test('管理员创建账号 → 登录 → 查询本人 → 停用后立即拒绝', async () => {
  await withServer(async (base) => {
    const created = await admin(base, 'POST', '/admin/accounts', {
      username: 'client01',
      password: 'secret123',
      name: '客户一号',
      days: 30,
    });
    assert.equal(created.status, 200);
    assert.equal(created.data.account.username, 'client01');
    assert.equal(created.data.account.daysLeft, 30);

    const wrong = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client01', password: 'bad' }),
    });
    assert.equal(wrong.status, 401);

    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client01', password: 'secret123' }),
    });
    assert.equal(login.status, 200);
    const loginData = await login.json();
    assert.ok(loginData.token);

    const me = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    assert.equal(me.status, 200);
    const meData = await me.json();
    assert.equal(meData.account.name, '客户一号');
    assert.equal(meData.account.disabled, false);

    const disabled = await admin(base, 'POST', `/admin/accounts/${created.data.account.id}/disable`);
    assert.equal(disabled.status, 200);

    const meAfter = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    assert.equal(meAfter.status, 403);
    const relogin = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client01', password: 'secret123' }),
    });
    assert.equal(relogin.status, 403);
  });
});

test('授权到期后拒绝登录，续期后可再登录', async () => {
  const file = path.join(dataDir, 'accounts.json');
  await withServer(async (base) => {
    const created = await admin(base, 'POST', '/admin/accounts', {
      username: 'client02',
      password: 'secret123',
      days: 30,
    });
    assert.equal(created.status, 200);
    const id = created.data.account.id;

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const target = data.accounts.find((item) => item.id === id);
    target.expiresAt = new Date(Date.now() - 86400000).toISOString();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    const expired = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client02', password: 'secret123' }),
    });
    assert.equal(expired.status, 403);
    assert.match((await expired.json()).error, /到期/);

    const extended = await admin(base, 'POST', `/admin/accounts/${id}/extend`, { days: 30 });
    assert.equal(extended.status, 200);
    const relogin = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client02', password: 'secret123' }),
    });
    assert.equal(relogin.status, 200);
  });
});

test('伪造令牌、无效管理员令牌都会被拒绝', async () => {
  await withServer(async (base) => {
    const me = await fetch(`${base}/auth/me`, { headers: { Authorization: 'Bearer a.b' } });
    assert.equal(me.status, 401);

    const badAdmin = await fetch(`${base}/admin/accounts`, {
      headers: { 'X-Admin-Token': 'wrong-token' },
    });
    assert.equal(badAdmin.status, 401);
  });
});

test('管理后台页面：根路径跳转 /admin 并返回 HTML', async () => {
  await withServer(async (base) => {
    const root = await fetch(`${base}/`, { redirect: 'manual' });
    assert.equal(root.status, 302);
    assert.equal(root.headers.get('location'), '/admin');

    const page = await fetch(`${base}/admin`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type') || '', /text\/html/);
    const html = await page.text();
    assert.match(html, /账号授权管理/);
    assert.match(html, /管理员登录/);
    assert.match(html, /\/admin\/accounts/);
  });
});

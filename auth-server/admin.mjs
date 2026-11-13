#!/usr/bin/env node
/**
 * 跨多多账号服务 · 管理员命令行
 *
 * 直接在服务器上操作 auth-server/data/accounts.json（不用起服务）：
 *   node admin.mjs list
 *   node admin.mjs create <用户名> --name "张三" --days 30 [--password 密码]
 *   node admin.mjs disable <用户名>            # 立即停用（客户端下次校验就拒）
 *   node admin.mjs enable <用户名>
 *   node admin.mjs reset <用户名> [--password 新密码]
 *   node admin.mjs extend <用户名> --days 30   # 续期（从现在/到期日较晚者算起）
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.AUTH_DATA_DIR || path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

function readData() {
  try {
    const data = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    if (!Array.isArray(data.accounts)) data.accounts = [];
    return data;
  } catch {
    return { accounts: [] };
  }
}

function writeData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${ACCOUNTS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, ACCOUNTS_FILE);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(String(password), salt, 64).toString('hex') };
}

function randomPassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 10; i += 1) out += alphabet[crypto.randomInt(alphabet.length)];
  return out;
}

function publicAccount(account) {
  const daysLeft = account.expiresAt
    ? Math.max(0, Math.ceil((new Date(account.expiresAt).getTime() - Date.now()) / 86400000))
    : null;
  return {
    username: account.username,
    name: account.name,
    id: account.id,
    expiresAt: account.expiresAt,
    daysLeft,
    disabled: Boolean(account.disabledAt),
    note: account.note || '',
  };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      out[key] = value;
    } else {
      out._.push(item);
    }
  }
  return out;
}

function find(data, key) {
  const value = String(key || '').toLowerCase();
  return data.accounts.find((item) => item.id === key || String(item.username).toLowerCase() === value) || null;
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0];
const target = args._[1];
const data = readData();

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

switch (command) {
  case 'list': {
    if (!data.accounts.length) { console.log('（还没有账号）'); break; }
    console.table(data.accounts.map(publicAccount));
    break;
  }
  case 'create': {
    if (!target) fail('用法：node admin.mjs create <用户名> [--name 姓名] [--days 30]');
    if (!/^[A-Za-z0-9_.-]{2,32}$/.test(target)) fail('用户名需 2–32 位字母数字');
    if (find(data, target)) fail('用户名已存在');
    const password = args.password && args.password !== 'true' ? String(args.password) : randomPassword();
    const { salt, hash } = hashPassword(password);
    const days = Math.max(1, Number(args.days) || 30);
    const account = {
      id: crypto.randomUUID(),
      username: target,
      name: String(args.name && args.name !== 'true' ? args.name : target).slice(0, 40),
      role: args.role === 'admin' ? 'admin' : 'user',
      salt,
      hash,
      note: String(args.note && args.note !== 'true' ? args.note : '').slice(0, 200),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
      disabledAt: null,
    };
    data.accounts.push(account);
    writeData(data);
    console.log(`✓ 已创建账号 ${account.username}（${account.name}），有效期 ${days} 天，到期 ${account.expiresAt}`);
    console.log(`  密码：${password}`);
    break;
  }
  case 'disable':
  case 'enable': {
    const account = find(data, target);
    if (!account) fail('账号不存在');
    account.disabledAt = command === 'disable' ? new Date().toISOString() : null;
    writeData(data);
    console.log(`✓ ${account.username} 已${command === 'disable' ? '停用（客户端下次校验即拒绝）' : '恢复'}`);
    break;
  }
  case 'reset': {
    const account = find(data, target);
    if (!account) fail('账号不存在');
    const password = args.password && args.password !== 'true' ? String(args.password) : randomPassword();
    if (password.length < 6) fail('密码至少 6 位');
    Object.assign(account, hashPassword(password));
    writeData(data);
    console.log(`✓ ${account.username} 密码已重置`);
    console.log(`  新密码：${password}`);
    break;
  }
  case 'extend': {
    const account = find(data, target);
    if (!account) fail('账号不存在');
    const days = Math.max(1, Number(args.days) || 30);
    const base = Math.max(Date.now(), new Date(account.expiresAt || 0).getTime());
    account.expiresAt = new Date(base + days * 86400000).toISOString();
    account.disabledAt = null;
    writeData(data);
    console.log(`✓ ${account.username} 已续期 ${days} 天，新到期 ${account.expiresAt}`);
    break;
  }
  default:
    console.log(`用法：
  node admin.mjs list
  node admin.mjs create <用户名> [--name 姓名] [--days 30] [--password 密码]
  node admin.mjs disable <用户名|id>
  node admin.mjs enable <用户名|id>
  node admin.mjs reset <用户名|id> [--password 新密码]
  node admin.mjs extend <用户名|id> --days 30`);
}

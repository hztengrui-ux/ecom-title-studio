import { reactive } from 'vue';
import { requestJson } from './api.js';

// 在线账号授权：桌面版启动 / 每 30 分钟向 https://api.kuaduoduo.vip 校验一次
// 令牌与账号信息只存本地 localStorage，退出登录即清除
const STORAGE_KEY = 'tw.auth.v1';
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export const auth = reactive({
  token: '',
  account: null,
  ready: false,
  loggingIn: false,
  checking: false,
  error: '',
  offline: false,
  lastCheckedAt: '',
});

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: auth.token, account: auth.account }),
    );
  } catch {
    // localStorage 不可用时静默降级为本次会话有效
  }
}

function clearState() {
  auth.token = '';
  auth.account = null;
  auth.offline = false;
  auth.lastCheckedAt = '';
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadAuth() {
  if (auth.ready) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved?.token) {
      auth.token = String(saved.token);
      auth.account = saved.account || null;
    }
  } catch {
    // 数据损坏按未登录处理
  }
  auth.ready = true;
}

export function daysLeft() {
  const expiresAt = auth.account?.expiresAt;
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diff)) return null;
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function accountLabel() {
  if (!auth.account) return '';
  return auth.account.name ? `${auth.account.username}（${auth.account.name}）` : auth.account.username;
}

export async function login(username, password) {
  auth.loggingIn = true;
  auth.error = '';
  auth.offline = false;
  try {
    const data = await requestJson(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
      20000,
    );
    if (!data?.ok || !data?.token) throw Object.assign(new Error('登录失败'), { code: 'AUTH_DENIED' });
    auth.token = data.token;
    auth.account = data.account || null;
    auth.lastCheckedAt = new Date().toISOString();
    persist();
    return data;
  } finally {
    auth.loggingIn = false;
  }
}

export function logout(message = '') {
  clearState();
  auth.error = message;
}

// 校验登录态；返回 { ok, reason }
// 401/403 → 账号停用 / 到期 / 令牌失效，直接退出登录
// 网络异常 → 保留登录态（离线容忍），只标记 offline
export async function refresh({ silent = false } = {}) {
  if (!auth.token) return { ok: false, reason: 'no-token' };
  auth.checking = true;
  try {
    const data = await requestJson(
      '/api/auth/me',
      { headers: { Authorization: `Bearer ${auth.token}` } },
      15000,
    );
    if (!data?.ok || !data?.account) throw Object.assign(new Error('登录已失效'), { code: 'AUTH_INVALID' });
    auth.account = data.account;
    auth.offline = false;
    auth.lastCheckedAt = new Date().toISOString();
    persist();
    return { ok: true };
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '登录校验失败');
    if (code === 'AUTH_INVALID' || code.startsWith('HTTP_401') || code.startsWith('HTTP_403')) {
      logout(message);
      return { ok: false, reason: 'denied', message };
    }
    auth.offline = true;
    auth.lastCheckedAt = new Date().toISOString();
    return { ok: false, reason: 'network', message };
  } finally {
    auth.checking = false;
  }
}

let timer = null;

export function startAuthWatch(onDenied) {
  stopAuthWatch();
  timer = setInterval(async () => {
    const result = await refresh({ silent: true });
    if (!result.ok && result.reason === 'denied') onDenied?.(result.message);
  }, CHECK_INTERVAL_MS);
}

export function stopAuthWatch() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

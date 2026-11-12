const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function requestJson(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), ...(options.body ? JSON_HEADERS : {}) },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(data?.error?.message || `请求失败 (${response.status})`);
      error.code = data?.error?.code || `HTTP_${response.status}`;
      error.detail = data?.error?.detail;
      throw error;
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeout = new Error('请求超时，请重试或换一个更快的模型');
      timeout.code = 'CLIENT_TIMEOUT';
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const getJson = (url, timeoutMs = 20000) => requestJson(url, {}, timeoutMs);

export const postJson = (url, body, timeoutMs = 150000) =>
  requestJson(url, { method: 'POST', body: JSON.stringify(body) }, timeoutMs);

export async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

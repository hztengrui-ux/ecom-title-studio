import { computed, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DEFAULT_RULES, migrateRules, normalizeRules } from '../lib/rules.mjs';
import { PLATFORMS, STRATEGIES } from '../lib/platforms.mjs';
import { getJson, postJson, blobToBase64, downloadBlob } from './api.js';

export const STORAGE = {
  settings: 'tw.settings.v1',
  rules: 'tw.rules.v1',
  brief: 'tw.brief.v1',
  history: 'tw.history.v1',
};

export const PRESETS = [
  { id: 'demo', name: '演示模式', note: '零配置 · 内置示例', baseUrl: '', model: '' },
  { id: 'qwen', name: '通义千问', note: 'DashScope 兼容', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-vl-max-latest' },
  { id: 'zhipu', name: '智谱 GLM', note: 'BigModel 开放平台', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4.5v' },
  { id: 'siliconflow', name: '硅基流动', note: 'Qwen VL / GLM', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-VL-72B-Instruct' },
  { id: 'doubao', name: '火山引擎豆包', note: 'Ark 方舟 · Seed 1.6 Vision', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seed-1-6-vision-250815' },
  { id: 'deepseek', name: 'DeepSeek', note: '官方 · 图片输入', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-flash' },
  { id: 'kimi', name: 'Kimi 月之暗面', note: 'K3.1 Pro · 多模态', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k3.1-pro' },
  { id: 'gemini', name: 'Google Gemini', note: 'OpenAI 兼容 · 图片输入', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  { id: 'openai', name: 'OpenAI', note: 'GPT-4.1 mini', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' },
  { id: 'openrouter', name: 'OpenRouter', note: '聚合网关 · 选视觉模型', baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.5-flash' },
  { id: 'mistral', name: 'Mistral Pixtral', note: 'Pixtral · 图片输入', baseUrl: 'https://api.mistral.ai/v1', model: 'pixtral-12b-2409' },
  { id: 'ollama', name: 'Ollama 本地', note: '无需密钥 · 需先拉模型', baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen2.5vl:7b' },
  { id: 'custom', name: '自定义', note: '任意 OpenAI 兼容接口', baseUrl: '', model: '' },
];

export const PROVIDER_HINTS = {
  qwen: '请使用支持图片输入的 qwen-vl 系列；纯文本模型会拒绝图片。',
  zhipu: 'GLM 视觉模型以 BigModel 控制台实际模型名为准。',
  siliconflow: '硅基流动需选择带 VL 的视觉模型，并确认账号已开通图片输入。',
  doubao: '方舟一般填推理接入点 ID（ep-...）；旧版 1.5 模型可能已下线。',
  deepseek: '官方 API 当前用 deepseek-flash；旧 deepseek-chat 是纯文本模型。',
  kimi: '当前多模态模型是 kimi-k3.1-pro；旧 moonshot-v1-vision 系列已下线。',
  gemini: 'Gemini 走 OpenAI 兼容层，接口地址保持 /v1beta/openai。',
  openai: '需要支持图片输入的 OpenAI 模型；纯文本模型会拒绝图片。',
  openrouter: '模型名填 OpenRouter 上支持图片的完整 ID，例如 google/gemini-2.5-flash。',
  mistral: 'Pixtral 支持图片输入；模型名以 Mistral 控制台当前可用列表为准。',
  ollama: '先 ollama pull 一个视觉模型，例如 qwen2.5vl:7b。',
  custom: '接口需兼容 POST /chat/completions，并接受 image_url 图片内容。',
};

export const PROMPT_PRESETS = {
  standard: '请结合图片和卖点，突出材质、适用场景、人群，提升点击转化率。',
  festival: '请突出节日/礼赠场景、图案主题与氛围，不写价格、销量、折扣。',
  param: '优先写清材质、尺寸、容量、结构等可验证参数，图片看不出的信息不要猜测。',
  brand: '保持简洁、克制的品牌语气，避免夸张词、极限词和平台违禁词。',
};

export const TARGET_CATEGORY_OPTIONS = [
  { value: 'generic', label: '通用素材（默认）' },
  { value: 'apparel', label: '服装 / 印花' },
  { value: 'home', label: '家居 / 装饰画' },
  { value: 'drinkware', label: '杯具 / 餐具' },
  { value: 'stationery', label: '文具 / 贴纸' },
  { value: 'custom', label: '其他 / 自定义' },
];

const DEFAULT_SETTINGS = {
  provider: 'demo',
  baseUrl: '',
  model: '',
  apiKey: '',
  temperature: 0.7,
};

const DEFAULT_BRIEF = {
  category: '',
  brand: '',
  sellingPoints: '',
  audience: '',
};

function readStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be full; keep in-memory state usable.
  }
}

function loadSettings() {
  const stored = readStored(STORAGE.settings, {});
  const settings = { ...DEFAULT_SETTINGS, ...(stored && typeof stored === 'object' ? stored : {}) };
  if (settings.provider === 'deepseek' && ['deepseek-chat', 'deepseek-reasoner'].includes(settings.model)) {
    settings.model = 'deepseek-flash';
  }
  return settings;
}

function loadRules() {
  const stored = readStored(STORAGE.rules, {}) || {};
  const rules = normalizeRules(migrateRules(stored));
  if (rules.concurrencyMode === 'auto') rules.concurrency = recommendedConcurrency();
  return rules;
}

export function recommendedConcurrency() {
  const cores = Number(navigator.hardwareConcurrency) || 4;
  const memory = Number(navigator.deviceMemory) || 8;
  let value = 3;
  if (cores >= 24) value = 10;
  else if (cores >= 16) value = 8;
  else if (cores >= 12) value = 7;
  else if (cores >= 8) value = 6;
  else if (cores >= 6) value = 4;
  if (memory <= 4) value = Math.min(value, 3);
  else if (memory <= 8) value = Math.min(value, 5);
  return Math.max(2, Math.min(10, value));
}

export function toast(message, type = 'info') {
  ElMessage({
    message: String(message || ''),
    type: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
    duration: type === 'error' ? 4200 : 2200,
    showClose: type === 'error',
  });
}

export const state = reactive({
  ready: false,
  metaLoading: true,
  mode: 'single',
  platforms: [],
  strategies: [],
  samples: [],
  settings: loadSettings(),
  rules: loadRules(),
  brief: { ...DEFAULT_BRIEF, ...readStored(STORAGE.brief, {}) },
  selectedPlatforms: ['temu'],
  selectedStrategies: ['flow'],
  single: {
    image: null,
    busy: false,
    result: null,
    error: null,
    activePlatform: '',
    loadingStep: 0,
    elapsedMs: 0,
  },
  batch: {
    items: [],
    name: '',
    running: false,
    phase: 'idle',
    cancel: false,
    latestId: '',
    filter: '',
    expanded: new Set(),
    preprocess: { running: false, total: 0, done: 0 },
    startedAt: 0,
    elapsedMs: 0,
    concurrencyUsed: 0,
  },
  history: readStored(STORAGE.history, []),
  ui: {
    settings: false,
    rules: false,
    history: false,
    help: false,
    preview: false,
  },
});

export const currentPlatform = computed(() =>
  state.platforms.find((platform) => platform.id === state.single.activePlatform) || null,
);

export const currentTitles = computed(() => {
  if (!state.single.result) return [];
  return (state.single.result.titles || []).filter(
    (title) => title.platform === state.single.activePlatform,
  );
});

export const currentKeywords = computed(() => {
  if (!state.single.result) return null;
  const english = currentPlatform.value?.lang === 'en';
  const primary = english ? state.single.result.keywordsEn : state.single.result.keywords;
  if (english && !(primary?.core || []).length) return state.single.result.keywords;
  return primary;
});

export const filteredBatchItems = computed(() => {
  const q = String(state.batch.filter || '').trim().toLowerCase();
  if (!q) return state.batch.items;
  return state.batch.items.filter((item) =>
    [item.sku, item.name, item.result?.product?.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
});

export const doneBatchItems = computed(() =>
  state.batch.items.filter((item) => item.status === 'done' && item.result),
);

export function selectedIndexes(item) {
  if (!(item.selectedTitleIndexes instanceof Set)) {
    item.selectedTitleIndexes = new Set((item.result?.titles || []).map((_, index) => index));
  }
  return item.selectedTitleIndexes;
}

export const selectedTitleCount = computed(() =>
  state.batch.items.reduce(
    (sum, item) => sum + (item.status === 'done' ? selectedIndexes(item).size : 0),
    0,
  ),
);

export const preprocessStats = computed(() => {
  const files = state.batch.items.filter((item) => item.file);
  return {
    total: files.length,
    done: files.filter((item) => item.preprocessState === 'done').length,
    original: files.reduce((sum, item) => sum + (Number(item.originalSize) || 0), 0),
    processed: files.reduce((sum, item) => sum + (Number(item.processedSize) || 0), 0),
  };
});

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(ms) {
  const value = Number(ms) || 0;
  if (!value) return '0.0 秒';
  return `${(value / 1000).toFixed(1)} 秒`;
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function platformShort(id) {
  return state.platforms.find((platform) => platform.id === id)?.short || id || '';
}

export function persistSettings() {
  writeStored(STORAGE.settings, state.settings);
}

export function persistRules() {
  writeStored(STORAGE.rules, state.rules);
}

export function persistBrief() {
  writeStored(STORAGE.brief, state.brief);
}

// 设置一改就落盘，避免用户填完 API Key 直接关窗口时丢失。
watch(state.settings, persistSettings, { deep: true });
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    persistSettings();
    persistRules();
    persistBrief();
  });
}

export function setRules(next) {
  const normalized = normalizeRules({ ...state.rules, ...next });
  if (normalized.concurrencyMode === 'auto') normalized.concurrency = recommendedConcurrency();
  state.rules = normalized;
  persistRules();
}

export function isKeyOptional(baseUrl) {
  return /^(http:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/i.test(String(baseUrl || ''));
}

export function isModelReady() {
  if (state.settings.provider === 'demo') return true;
  return Boolean(
    state.settings.baseUrl &&
      state.settings.model &&
      (state.settings.apiKey || isKeyOptional(state.settings.baseUrl)),
  );
}

export function requestSettings() {
  const { provider, baseUrl, model, apiKey, temperature } = state.settings;
  return { provider, baseUrl, model, apiKey, temperature };
}

export async function loadMeta() {
  state.metaLoading = true;
  const [platformResult, sampleResult] = await Promise.allSettled([
    getJson('/api/platforms'),
    getJson('/api/samples'),
  ]);
  state.platforms = platformResult.status === 'fulfilled'
    ? platformResult.value.platforms
    : Object.values(PLATFORMS);
  state.strategies = platformResult.status === 'fulfilled'
    ? platformResult.value.strategies
    : STRATEGIES;
  state.samples = sampleResult.status === 'fulfilled' ? sampleResult.value.samples || [] : [];
  const available = new Set(state.platforms.map((platform) => platform.id));
  state.selectedPlatforms = state.selectedPlatforms.filter((id) => available.has(id));
  if (!state.selectedPlatforms.length) {
    state.selectedPlatforms = [state.platforms[0]?.id || 'temu'];
  }
  const strategyIds = new Set(state.strategies.map((strategy) => strategy.id));
  state.selectedStrategies = state.selectedStrategies.filter((id) => strategyIds.has(id));
  if (!state.selectedStrategies.length) {
    state.selectedStrategies = [state.strategies[0]?.id || 'flow'];
  }
  // 每个平台只生成 1 条标题：策略是单选，只保留第一个有效选择。
  state.selectedStrategies = state.selectedStrategies.slice(0, 1);
  state.metaLoading = false;
  state.ready = true;
}

export function togglePlatform(id) {
  if (state.selectedPlatforms.includes(id)) {
    if (state.selectedPlatforms.length === 1) {
      toast('至少保留一个发布平台');
      return;
    }
    state.selectedPlatforms = state.selectedPlatforms.filter((item) => item !== id);
  } else {
    state.selectedPlatforms = [...state.selectedPlatforms, id];
  }
}

export function toggleStrategy(id) {
  // 每个平台只出 1 条标题，策略因此是单选：再点一次不会取消。
  if (state.selectedStrategies.includes(id)) return;
  state.selectedStrategies = [id];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片读取失败'));
    image.src = src;
  });
}

export async function processImage(file, maxSide = 1280, resizeMode = 'width') {
  if (!file?.type?.startsWith('image/')) throw new Error('请选择 JPG、PNG 或 WebP 图片');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('只支持 JPG、PNG 或 WebP');
  if (file.size > 15 * 1024 * 1024) throw new Error('图片超过 15MB，请先压缩');
  const bitmap = typeof createImageBitmap === 'function' ? await createImageBitmap(file) : await loadImage(URL.createObjectURL(file));
  const width = bitmap.width;
  const height = bitmap.height;
  const limit = Math.min(4096, Math.max(320, Number(maxSide) || 1280));
  const scale = resizeMode === 'width'
    ? Math.min(1, limit / width)
    : Math.min(1, limit / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  return {
    sampleId: null,
    previewUrl: dataUrl,
    dataUrl,
    width,
    height,
    targetWidth,
    targetHeight,
    processedSize: Math.round(dataUrl.length * 0.75),
    name: file.name || '商品图',
    size: file.size,
  };
}

const sampleCache = new Map();
export async function sampleDataUrl(sampleId) {
  if (sampleCache.has(sampleId)) return sampleCache.get(sampleId);
  const sample = state.samples.find((item) => item.id === sampleId);
  if (!sample) throw new Error('找不到示例图');
  const blob = await (await fetch(sample.file)).blob();
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const size = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.fillStyle = '#f4efe5';
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    sampleCache.set(sampleId, dataUrl);
    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function ensureSingleImage() {
  if (state.single.image?.dataUrl) return state.single.image.dataUrl;
  if (state.single.image?.sampleId) {
    const dataUrl = await sampleDataUrl(state.single.image.sampleId);
    state.single.image.dataUrl = dataUrl;
    return dataUrl;
  }
  throw new Error('图片已失效，请重新上传');
}

export async function selectSingleFile(file) {
  if (state.single.busy) {
    toast('正在生成，稍等一下');
    return;
  }
  try {
    const image = await processImage(file, state.rules.imageMaxEdge, state.rules.imageResizeMode);
    state.single.image = image;
    state.single.result = null;
    state.single.error = null;
    if (image.width < 500 || image.height < 500) toast('图片尺寸偏小，建议换一张 800px 以上的图');
    else toast('图片已就绪', 'success');
  } catch (error) {
    toast(error.message || '图片读取失败', 'error');
  }
}

export function selectSample(sample) {
  if (!sample) return;
  state.single.image = {
    sampleId: sample.id,
    name: sample.label || sample.name,
    previewUrl: sample.file,
    dataUrl: '',
    width: 0,
    height: 0,
  };
  state.brief = { ...DEFAULT_BRIEF, ...(sample.brief || {}) };
  persistBrief();
  state.single.result = null;
  state.single.error = null;
  state.mode = 'single';
}

export function clearSingleImage() {
  state.single.image = null;
  state.single.result = null;
  state.single.error = null;
}

export async function generateSingle() {
  if (state.single.busy) return;
  if (!state.single.image) {
    toast('先上传一张商品图，或选一个示例');
    return;
  }
  if (!state.selectedPlatforms.length) {
    toast('至少选择一个发布平台');
    return;
  }
  if (!state.selectedStrategies.length) {
    toast('至少选择一个标题策略');
    return;
  }
  if (state.settings.provider === 'demo' && !state.single.image.sampleId) {
    toast('演示模式只识别内置示例图，请先在设置里配置视觉模型', 'error');
    state.ui.settings = true;
    return;
  }
  if (state.settings.provider !== 'demo' && !isModelReady()) {
    toast('视觉模型还没有配置好', 'error');
    state.ui.settings = true;
    return;
  }

  state.single.busy = true;
  state.single.error = null;
  state.single.result = null;
  state.single.loadingStep = 0;
  const startedAt = Date.now();
  const timer = setInterval(() => {
    state.single.loadingStep = Math.min(3, state.single.loadingStep + 1);
  }, 850);
  try {
    let result;
    if (state.settings.provider === 'demo') {
      const data = await postJson('/api/demo', {
        sampleId: state.single.image.sampleId,
        platforms: state.selectedPlatforms,
        strategies: state.selectedStrategies,
        titlesPerPlatform: 1,
        rules: state.rules,
      }, 30000);
      result = data.result;
    } else {
      const image = await ensureSingleImage();
      const data = await postJson('/api/analyze', {
        image,
        brief: state.brief,
        platforms: state.selectedPlatforms,
        strategies: state.selectedStrategies,
        titlesPerPlatform: 1,
        rules: state.rules,
        settings: requestSettings(),
      }, 240000);
      result = data.result;
    }
    if (!result?.titles?.length) throw new Error('模型返回了空结果，可以换一批或换一个视觉模型');
    state.single.result = result;
    const counts = result.platformCounts || {};
    state.single.activePlatform =
      state.selectedPlatforms.find((id) => (counts[id] || 0) > 0) || state.selectedPlatforms[0];
    addHistory(result);
  } catch (error) {
    state.single.error = {
      title: error?.code === 'CONFIG_REQUIRED' ? '模型还没有配置好' : '生成没有完成',
      message: error?.message || '生成失败，请重试',
      detail: error?.detail || (error?.code ? `错误码：${error.code}` : ''),
    };
  } finally {
    clearInterval(timer);
    state.single.busy = false;
    state.single.loadingStep = 0;
    state.single.elapsedMs = Date.now() - startedAt;
  }
}

export function addHistory(result) {
  const entry = {
    id: `h_${Date.now()}`,
    at: new Date().toISOString(),
    name: result.product?.name || state.single.image?.name || '未命名商品',
    thumb: state.single.image?.previewUrl || '',
    result,
    platforms: [...state.selectedPlatforms],
    strategies: [...state.selectedStrategies],
  };
  state.history = [entry, ...state.history].slice(0, 8);
  try {
    writeStored(STORAGE.history, state.history);
  } catch {
    // ignore quota
  }
}

export function openHistory(entry) {
  state.mode = 'single';
  state.single.result = entry.result;
  state.single.error = null;
  state.single.activePlatform = entry.platforms?.[0] || state.platforms[0]?.id;
  state.single.image = entry.thumb ? {
    sampleId: null,
    name: entry.name,
    previewUrl: entry.thumb,
    dataUrl: entry.thumb,
  } : state.single.image;
  state.ui.history = false;
}

export function clearHistory() {
  state.history = [];
  writeStored(STORAGE.history, []);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text || ''));
    toast('已复制', 'success');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = String(text || '');
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    toast('已复制', 'success');
  }
}

function skuFromName(name) {
  return String(name || 'image').replace(/\.[a-z0-9]+$/i, '').trim();
}

export function addBatchFiles(files) {
  const accepted = [];
  for (const file of Array.from(files || [])) {
    if (!file?.type?.startsWith('image/')) continue;
    if (file.size > 15 * 1024 * 1024) {
      toast(`${file.name} 超过 15MB，已跳过`, 'error');
      continue;
    }
    const item = {
      id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      file,
      sampleId: null,
      name: file.name || '商品图',
      sku: skuFromName(file.name),
      previewUrl: URL.createObjectURL(file),
      originalSize: file.size,
      processedSize: 0,
      processedWidth: 0,
      processedHeight: 0,
      dataUrl: '',
      preprocessState: 'pending',
      preprocessError: '',
      status: 'queued',
      error: '',
      result: null,
      selectedTitleIndexes: new Set(),
      finishedAt: 0,
      elapsedMs: 0,
    };
    state.batch.items.push(item);
    accepted.push(item);
  }
  if (accepted.length) {
    state.mode = 'batch';
    toast(`已加入 ${accepted.length} 张图片`, 'success');
  }
}

export function addBatchSamples() {
  const existing = new Set(state.batch.items.map((item) => item.sampleId).filter(Boolean));
  let count = 0;
  for (const sample of state.samples) {
    if (existing.has(sample.id)) continue;
    state.batch.items.push({
      id: `bs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      file: null,
      sampleId: sample.id,
      name: `${sample.label || sample.name}.svg`,
      sku: sample.label || sample.name,
      previewUrl: sample.file,
      originalSize: 0,
      processedSize: 0,
      processedWidth: 0,
      processedHeight: 0,
      dataUrl: '',
      preprocessState: 'done',
      preprocessError: '',
      status: 'queued',
      error: '',
      result: null,
      selectedTitleIndexes: new Set(),
      finishedAt: 0,
      elapsedMs: 0,
    });
    count += 1;
  }
  state.mode = 'batch';
  toast(count ? `已加入 ${count} 个示例` : '示例已经在队列里了', count ? 'success' : 'info');
}

export function removeBatchItem(id) {
  const item = state.batch.items.find((candidate) => candidate.id === id);
  if (item?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
  state.batch.items = state.batch.items.filter((candidate) => candidate.id !== id);
}

export function clearBatch() {
  for (const item of state.batch.items) {
    if (item.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
  }
  state.batch.items = [];
  state.batch.latestId = '';
  state.batch.filter = '';
  state.batch.phase = 'idle';
  state.batch.running = false;
  state.batch.cancel = false;
  state.batch.preprocess = { running: false, total: 0, done: 0 };
  state.batch.startedAt = 0;
  state.batch.elapsedMs = 0;
  state.batch.concurrencyUsed = 0;
}

export async function preprocessItem(item) {
  if (item.preprocessState === 'done') return true;
  if (item.sampleId) {
    item.preprocessState = 'done';
    return true;
  }
  try {
    const processed = await processImage(item.file, state.rules.imageMaxEdge, state.rules.imageResizeMode);
    item.dataUrl = processed.dataUrl;
    item.previewUrl = processed.dataUrl;
    item.processedSize = processed.processedSize;
    item.processedWidth = processed.targetWidth;
    item.processedHeight = processed.targetHeight;
    item.preprocessState = 'done';
    item.preprocessError = '';
    return true;
  } catch (error) {
    item.preprocessState = 'error';
    item.preprocessError = error.message || '预处理失败';
    item.status = 'error';
    item.error = item.preprocessError;
    return false;
  }
}

export async function preprocessBatch(items, { manual = false } = {}) {
  const queue = items.filter((item) => item.file && item.preprocessState !== 'done');
  if (!queue.length) {
    if (manual) toast('没有需要预处理的图片');
    return true;
  }
  state.batch.phase = 'preprocess';
  state.batch.preprocess = { running: true, total: queue.length, done: 0 };
  state.batch.cancel = false;
  const lanes = Math.min(queue.length, 4);
  let cursor = 0;
  try {
    await Promise.all(Array.from({ length: lanes }, async () => {
      while (!state.batch.cancel && cursor < queue.length) {
        const item = queue[cursor];
        cursor += 1;
        await preprocessItem(item);
        state.batch.preprocess.done += 1;
      }
    }));
  } finally {
    state.batch.preprocess.running = false;
    state.batch.phase = 'idle';
  }
  if (state.batch.cancel) return false;
  return true;
}

export async function preprocessOnly() {
  if (state.batch.running || state.batch.preprocess.running) return;
  await preprocessBatch(state.batch.items, { manual: true });
  const stats = preprocessStats.value;
  if (stats.total) toast(`预处理完成：${stats.done}/${stats.total} 张`, 'success');
}

export function stopBatch() {
  if (!(state.batch.running || state.batch.preprocess.running)) return;
  state.batch.cancel = true;
  toast('正在停止…');
}

async function processBatchItem(item) {
  item.status = 'processing';
  item.error = '';
  const itemStartedAt = Date.now();
  try {
    let result;
    if (state.settings.provider === 'demo' && !item.sampleId) {
      throw new Error('演示模式只识别内置示例图，请先配置视觉模型');
    }
    if (state.settings.provider === 'demo' && item.sampleId) {
      const data = await postJson('/api/demo', {
        sampleId: item.sampleId,
        platforms: state.selectedPlatforms,
        strategies: state.selectedStrategies,
        titlesPerPlatform: 1,
        rules: state.rules,
      }, 30000);
      result = data.result;
    } else {
      if (!item.dataUrl) {
        const processed = await processImage(item.file, state.rules.imageMaxEdge, state.rules.imageResizeMode);
        item.dataUrl = processed.dataUrl;
      }
      const data = await postJson('/api/analyze', {
        image: item.dataUrl,
        brief: state.brief,
        platforms: state.selectedPlatforms,
        strategies: state.selectedStrategies,
        titlesPerPlatform: 1,
        rules: state.rules,
        settings: requestSettings(),
      }, 240000);
      result = data.result;
    }
    if (!result?.titles?.length) throw new Error('模型没有返回有效标题');
    item.result = result;
    item.selectedTitleIndexes = new Set(result.titles.map((_, index) => index));
    item.status = 'done';
    item.finishedAt = Date.now();
    state.batch.latestId = item.id;
  } catch (error) {
    item.status = 'error';
    item.error = error?.message || '处理失败';
  } finally {
    item.elapsedMs = Date.now() - itemStartedAt;
  }
}

export async function startBatch() {
  if (!state.batch.items.length) {
    toast('先导入图片或文件夹', 'error');
    return;
  }
  if (state.batch.running || state.batch.preprocess.running) return;
  if (state.settings.provider !== 'demo' && !isModelReady()) {
    toast('视觉模型还没有配置好', 'error');
    state.ui.settings = true;
    return;
  }
  if (state.settings.provider === 'demo' && !state.batch.items.some((item) => item.sampleId)) {
    toast('演示模式只识别内置示例图，请先配置视觉模型或加入示例', 'error');
    state.ui.settings = true;
    return;
  }

  state.batch.cancel = false;
  state.batch.phase = 'preprocess';
  state.batch.startedAt = Date.now();
  state.batch.elapsedMs = 0;
  const pending = state.batch.items.filter((item) => item.preprocessState !== 'done');
  if (pending.length) {
    const ok = await preprocessBatch(pending);
    if (!ok) {
      state.batch.running = false;
      toast('已停止预处理');
      return;
    }
  }
  const queue = state.batch.items.filter((item) => item.preprocessState === 'done' && item.status !== 'done');
  if (!queue.length) {
    toast('没有可继续识别的图片', 'error');
    return;
  }
  const concurrency = state.rules.concurrencyMode === 'auto'
    ? recommendedConcurrency()
    : Math.min(20, Math.max(1, Number(state.rules.concurrency) || 2));
  state.batch.concurrencyUsed = Math.min(concurrency, queue.length);
  state.batch.running = true;
  state.batch.phase = 'analyze';
  state.batch.items.forEach((item) => {
    if (queue.includes(item)) item.status = 'queued';
  });
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (!state.batch.cancel && cursor < queue.length) {
      const item = queue[cursor];
      cursor += 1;
      await processBatchItem(item);
    }
  });
  await Promise.all(workers);
  state.batch.running = false;
  state.batch.phase = 'idle';
  state.batch.elapsedMs = Date.now() - state.batch.startedAt;
  const failed = state.batch.items.filter((item) => item.status === 'error').length;
  if (state.batch.cancel) toast('已停止批量处理');
  else toast(`批量完成：成功 ${state.batch.items.filter((item) => item.status === 'done').length} 张${failed ? `，失败 ${failed} 张` : ''}`, failed ? 'error' : 'success');
}

export function defaultBatchName() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `跨多多标题工坊-批量-${stamp}`;
}

export function sanitizeFileName(value, fallback = 'title-studio') {
  return String(value || fallback)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || fallback;
}

export function batchBaseName() {
  return sanitizeFileName(state.batch.name || defaultBatchName());
}

export function selectedExportItems() {
  return doneBatchItems.value
    .map((item) => {
      const indexes = selectedIndexes(item);
      return {
        ...item,
        result: {
          ...item.result,
          titles: (item.result.titles || []).filter((_, index) => indexes.has(index)),
        },
      };
    })
    .filter((item) => item.result.titles.length);
}

function batchExportPayload() {
  return {
    title: batchBaseName(),
    platforms: [...state.selectedPlatforms],
    rules: state.rules,
    model: state.settings.provider === 'demo' ? '内置示例' : state.settings.model,
    items: selectedExportItems().map((item) => ({
      name: item.name,
      sku: item.sku,
      status: item.status,
      error: item.error,
      result: item.result,
      finishedAt: item.finishedAt,
    })),
  };
}

export async function fetchBatchXlsx() {
  const response = await fetch('/api/export/xlsx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batchExportPayload()),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message || `Excel 生成失败 (${response.status})`);
  }
  return response.blob();
}

export async function exportBatchExcel() {
  if (!selectedTitleCount.value) {
    toast('先勾选要导出的标题', 'error');
    return;
  }
  try {
    const blob = await fetchBatchXlsx();
    const base = batchBaseName();
    if (window.desktop?.saveExcel) {
      const base64 = await blobToBase64(blob);
      const result = await window.desktop.saveExcel({
        base64,
        defaultName: base,
        outputDir: state.rules.outputDir,
      });
      if (result?.ok) {
        toast(result.fallback ? `已改存到 ${result.path}` : 'Excel 已保存', 'success');
      } else if (!result?.canceled) {
        toast(result?.error || 'Excel 保存失败', 'error');
      }
    } else {
      downloadBlob(blob, `${base}.xlsx`);
      toast('Excel 已下载', 'success');
    }
  } catch (error) {
    toast(error.message || 'Excel 导出失败', 'error');
  }
}

function buildBatchCsv() {
  // 与 Excel 导出保持一致：只给上架要用的 5 列。
  const rows = [['SKU', '状态', '商品名', '品类', '主标题']];
  selectedExportItems().forEach((item) => {
    rows.push([
      item.sku || item.name,
      item.status === 'done' ? '完成' : item.status === 'error' ? '失败' : '待处理',
      item.result?.product?.name || '',
      item.result?.product?.category || '',
      item.result?.titles?.[0]?.text || '',
    ]);
  });
  return `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')}`;
}

export async function exportBatchCsv() {
  if (!selectedTitleCount.value) {
    toast('先勾选要导出的标题', 'error');
    return;
  }
  const base = batchBaseName();
  const content = buildBatchCsv();
  try {
    if (window.desktop?.saveTextFile) {
      const result = await window.desktop.saveTextFile({
        title: '导出 CSV',
        defaultName: base,
        extension: 'csv',
        content,
        outputDir: state.rules.outputDir,
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
      });
      if (result?.ok) toast(result.fallback ? `已改存到 ${result.path}` : 'CSV 已保存', 'success');
      else if (!result?.canceled) toast(result?.error || 'CSV 保存失败', 'error');
    } else {
      downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
    }
  } catch (error) {
    toast(error.message || 'CSV 导出失败', 'error');
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReportHtml(items, imagePaths = new Map()) {
  const base = batchBaseName();
  const cards = items.map((item) => {
    const result = item.result;
    const image = imagePaths.get(item.id);
    const titles = (result.titles || []).map((title) => `<li><span>${escapeHtml(platformShort(title.platform))} · ${escapeHtml(title.strategyLabel)}</span><div><p>${escapeHtml(title.text)}</p>${title.translation ? `<small>${escapeHtml(title.translation)}</small>` : ''}</div><em>${title.chars}/${title.limit} 字</em></li>`).join('');
    const keywords = [...(result.keywords?.core || []), ...(result.keywords?.long_tail || [])].map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('');
    return `<article class="item">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}">` : ''}<div class="item-main"><small>SKU ${escapeHtml(item.sku || item.name)} · ${escapeHtml(item.name)}</small><h2>${escapeHtml(result.product?.name || '未命名商品')}</h2><p>${escapeHtml(result.product?.summary || '')}</p><div class="keywords">${keywords}</div><ul class="titles">${titles}</ul>${result.description?.text ? `<p class="desc"><b>描述（${result.description.chars} 字）</b>${escapeHtml(result.description.text)}</p>` : ''}</div></article>`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(base)} · 批量结果</title><style>body{font:13px/1.65 "Microsoft YaHei",sans-serif;background:#f4efe5;color:#1e1c18;margin:0}main{max-width:1100px;margin:auto;padding:40px 28px 70px}header{border-bottom:1px solid #ddd3c2;padding-bottom:20px;margin-bottom:24px}h1{font-size:32px;margin:0 0 8px}.meta{color:#7b7366;font-size:11px;display:flex;gap:14px;flex-wrap:wrap}.item{display:grid;grid-template-columns:150px 1fr;gap:20px;padding:22px 0;border-bottom:1px solid #ddd3c2}.item img{width:150px;height:150px;object-fit:cover;border-radius:10px}.item small{color:#7b7366;font-family:Consolas,monospace;font-size:9px}.item h2{font-size:22px;margin:4px 0 6px}.item p{color:#7b7366;font-size:11px;margin:0}.keywords{display:flex;flex-wrap:wrap;gap:4px;margin:9px 0}.keywords span{border:1px solid #ddd3c2;border-radius:999px;padding:2px 7px;font-size:9px;background:#fff}.titles{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:7px}.titles li{display:grid;grid-template-columns:86px 1fr 52px;gap:9px;background:#fff;border:1px solid #ddd3c2;border-radius:8px;padding:8px 10px}.titles span{font-size:9px;color:#7b7366}.titles p{margin:0;color:#1e1c18;font-size:13px}.titles small{display:block;margin-top:2px;color:#7b7366;font-size:9px}.titles em{font-style:normal;font-family:Consolas,monospace;font-size:8px;color:#7b7366}.desc{margin-top:10px;padding-top:9px;border-top:1px dashed #ddd3c2;line-height:1.8}.desc b{color:#1e1c18}footer{margin-top:26px;color:#7b7366;font-size:9px}</style></head><body><main><header><h1>${escapeHtml(base)}</h1><div class="meta"><span>${items.length} 张完成</span><span>${escapeHtml(new Date().toLocaleString('zh-CN'))}</span><span>跨多多标题工坊</span></div></header>${cards || '<p>没有已完成的图片。</p>'}<footer>由「跨多多标题工坊」生成。标题与描述为上架草稿，请核对实物与平台规则。</footer></main></body></html>`;
}

async function imageEntryForItem(item, index) {
  const prefix = String(index + 1).padStart(3, '0');
  const ext = item.file
    ? (item.file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg').toLowerCase()
    : '.svg';
  const base = sanitizeFileName(item.name, 'image').replace(/\.[a-z0-9]+$/i, '');
  const name = `${prefix}-${base}${ext}`;
  if (item.file) {
    const filePath = window.desktop?.getPathForFile?.(item.file);
    if (filePath) return { name, path: filePath };
    return { name, base64: await blobToBase64(item.file) };
  }
  if (item.sampleId) return { name, sampleId: item.sampleId };
  return null;
}

export async function saveBatchFolder() {
  if (!selectedTitleCount.value) {
    toast('先勾选要导出的标题', 'error');
    return;
  }
  if (!window.desktop?.saveBatchPackage) {
    toast('保存文件夹需要桌面版', 'error');
    return;
  }
  try {
    const base = batchBaseName();
    const items = selectedExportItems();
    const blob = await fetchBatchXlsx();
    const xlsxBase64 = await blobToBase64(blob);
    const images = [];
    const imagePaths = new Map();
    if (state.rules.saveOriginalImages !== false) {
      for (const [index, item] of items.entries()) {
        const entry = await imageEntryForItem(item, index);
        if (!entry) continue;
        images.push(entry);
        imagePaths.set(item.id, `images/${entry.name}`);
      }
    }
    const result = await window.desktop.saveBatchPackage({
      baseName: base,
      outputDir: state.rules.outputDir,
      xlsxBase64,
      images,
      previewHtml: buildReportHtml(items, imagePaths),
      dataJson: JSON.stringify({
        title: base,
        generatedAt: new Date().toISOString(),
        rules: state.rules,
        items: items.map((item) => ({
          sku: item.sku,
          name: item.name,
          result: item.result,
        })),
      }, null, 2),
    });
    if (result?.ok) {
      toast(`已保存：${result.path}`, 'success');
    } else if (!result?.canceled) {
      toast(result?.error || '保存失败', 'error');
    }
  } catch (error) {
    toast(error.message || '保存失败', 'error');
  }
}

export function buildBatchTemplate() {
  return {
    app: 'KuaduoTitleWorkshop',
    type: 'batch-template',
    version: 1,
    savedAt: new Date().toISOString(),
    batchName: state.batch.name,
    platforms: [...state.selectedPlatforms],
    strategies: [...state.selectedStrategies],
    rules: { ...state.rules },
  };
}

export async function saveBatchTemplate() {
  const content = JSON.stringify(buildBatchTemplate(), null, 2);
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const base = `跨多多标题工坊-模板-${stamp}`;
  try {
    if (window.desktop?.saveTextFile) {
      const result = await window.desktop.saveTextFile({
        title: '保存批量模板',
        defaultName: base,
        extension: 'json',
        content,
        outputDir: state.rules.outputDir,
        filters: [{ name: '标题工坊模板', extensions: ['json'] }],
      });
      if (result?.ok) toast('模板已保存', 'success');
      else if (!result?.canceled) toast(result?.error || '模板保存失败', 'error');
    } else {
      downloadBlob(new Blob([content], { type: 'application/json;charset=utf-8' }), `${base}.json`);
    }
  } catch (error) {
    toast(error.message || '模板保存失败', 'error');
  }
}

export async function applyBatchTemplate(file) {
  if (!file) return;
  if (file.size > 1024 * 1024) throw new Error('模板文件过大');
  const data = JSON.parse(await file.text());
  if (!data || data.type !== 'batch-template' || !data.rules) throw new Error('不是有效的标题工坊模板');
  const rules = normalizeRules({ ...DEFAULT_RULES, ...data.rules });
  if (rules.concurrencyMode === 'auto') rules.concurrency = recommendedConcurrency();
  state.rules = rules;
  persistRules();
  const platformIds = new Set(state.platforms.map((platform) => platform.id));
  const platforms = Array.isArray(data.platforms) ? data.platforms.filter((id) => platformIds.has(id)) : [];
  if (platforms.length) state.selectedPlatforms = platforms;
  const strategyIds = new Set(state.strategies.map((strategy) => strategy.id));
  const strategies = Array.isArray(data.strategies) ? data.strategies.filter((id) => strategyIds.has(id)).slice(0, 3) : [];
  if (strategies.length) state.selectedStrategies = strategies;
  if (data.batchName) state.batch.name = String(data.batchName).slice(0, 80);
  toast('模板已载入', 'success');
}

export async function chooseOutputDir() {
  if (!window.desktop?.selectDirectory) {
    toast('选择文件夹需要桌面版', 'error');
    return;
  }
  const result = await window.desktop.selectDirectory({ title: '选择保存位置' });
  if (result?.ok && result.path) {
    setRules({ outputDir: result.path });
    toast('保存位置已更新', 'success');
  }
}

export function openPreview() {
  if (!doneBatchItems.value.length) {
    toast('还没有可预览的批量结果');
    return;
  }
  state.ui.preview = true;
}

export function closePreview() {
  state.ui.preview = false;
}

export function toggleBatchTitle(item, index, checked) {
  const selected = new Set(selectedIndexes(item));
  if (checked) selected.add(index);
  else selected.delete(index);
  item.selectedTitleIndexes = selected;
}

export function selectAllTitles(item, all) {
  item.selectedTitleIndexes = all
    ? new Set((item.result?.titles || []).map((_, index) => index))
    : new Set();
}

const DESKTOP = Boolean(window.desktop?.isDesktop);

const STORAGE = {
  settings: 'tw.settings.v1',
  history: 'tw.history.v1',
  brief: 'tw.brief.v1',
  rules: 'tw.rules.v1',
};

const DEFAULT_SETTINGS = {
  provider: 'demo',
  baseUrl: '',
  model: '',
  apiKey: '',
  temperature: 0.65,
};

const DEFAULT_RULES = {
  titleMinZh: 12,
  titleMaxZh: 30,
  titleMinEn: 40,
  titleMaxEn: 200,
  descriptionMin: 60,
  descriptionMax: 120,
  keywordMin: 3,
  keywordMax: 8,
  mustInclude: [],
  bannedWords: [],
  keywordCombos: [],
  assetMode: true,
  targetCategory: 'generic',
  targetCategoryLabel: '',
  titlePrefix: '',
  titleSuffix: '',
  targetLength: 0,
  language: 'auto',
  customPrompt: '请结合图片和卖点，突出材质、适用场景、人群，提升点击转化率。',
  imageMaxEdge: 1280,
  imageResizeMode: 'width',
  outputDir: '',
  saveOriginalImages: true,
  concurrency: 2,
  concurrencyMode: 'auto',
};



const PRESETS = [
  {
    id: 'demo',
    name: '演示模式',
    note: '零配置 · 内置示例',
    baseUrl: '',
    model: '',
  },
  {
    id: 'qwen',
    name: '通义千问',
    note: 'DashScope 兼容',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-max-latest',
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    note: 'BigModel 开放平台',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4.5v',
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    note: 'Qwen VL / GLM',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-VL-72B-Instruct',
  },
  {
    id: 'doubao',
    name: '火山引擎豆包',
    note: 'Ark 方舟 · Seed 1.6 Vision',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-1-6-vision-250815',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    note: '官方 · 图片输入',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-flash',
  },
  {
    id: 'kimi',
    name: 'Kimi 月之暗面',
    note: 'K3.1 Pro · 多模态',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k3.1-pro',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    note: 'OpenAI 兼容 · 图片输入',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    note: 'GPT-4.1 mini',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    note: '聚合网关 · 选视觉模型',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.5-flash',
  },
  {
    id: 'mistral',
    name: 'Mistral Pixtral',
    note: 'Pixtral · 图片输入',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'pixtral-12b-2409',
  },
  {
    id: 'ollama',
    name: 'Ollama 本地',
    note: '无需密钥 · 需先拉模型',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5vl:7b',
  },
  {
    id: 'custom',
    name: '自定义',
    note: '任意 OpenAI 兼容接口',
    baseUrl: '',
    model: '',
  },
];

const PROVIDER_HINTS = {
  qwen: {
    placeholder: 'qwen-vl-max-latest',
    text: '请使用支持图片输入的 qwen-vl 系列；纯文本模型会拒绝图片。',
  },
  zhipu: {
    placeholder: 'glm-4.5v',
    text: 'GLM 视觉模型以 BigModel 控制台实际模型名为准。',
  },
  siliconflow: {
    placeholder: 'Qwen/Qwen2.5-VL-72B-Instruct',
    text: '硅基流动需选择带 VL 的视觉模型，并确认账号已开通图片输入。',
  },
  doubao: {
    placeholder: 'ep-... 或 doubao-...',
    html: '方舟一般填「推理接入点 ID」（ep-...）；已开通模型直调的账号可填 doubao-seed-1-6-vision-250815。旧版 1.5 模型可能已下线；如果提示 model not found，请到 <a href="https://console.volcengine.com/ark" target="_blank" rel="noreferrer">方舟控制台</a> 复制当前接入点。',
  },
  deepseek: {
    placeholder: 'deepseek-flash',
    text: '官方 API 当前用 deepseek-flash（DeepSeek-V4.1-Flash，支持图片）；旧 deepseek-chat / deepseek-reasoner 是纯文本模型，应用会自动迁移。',
  },
  kimi: {
    placeholder: 'kimi-k3.1-pro',
    text: '当前多模态模型是 kimi-k3.1-pro；旧 moonshot-v1-vision 系列已于 2026-08 下线。',
  },
  gemini: {
    placeholder: 'gemini-2.5-flash',
    text: 'Gemini 走 OpenAI 兼容层，接口地址保持 /v1beta/openai，模型名如 gemini-2.5-flash。',
  },
  openai: {
    placeholder: 'gpt-4.1-mini',
    text: '需要支持图片输入的 OpenAI 模型；纯文本模型会拒绝图片。',
  },
  openrouter: {
    placeholder: 'google/gemini-2.5-flash',
    text: '模型名填 OpenRouter 上支持图片的完整 ID，例如 google/gemini-2.5-flash；以模型页标注的 input modalities 为准。',
  },
  mistral: {
    placeholder: 'pixtral-12b-2409',
    text: 'Pixtral 支持图片输入；模型名以 Mistral 控制台当前可用列表为准。',
  },
  ollama: {
    placeholder: 'qwen2.5vl:7b',
    text: '先 ollama pull 一个视觉模型，例如 qwen2.5vl:7b。',
  },
  custom: {
    placeholder: '任意视觉模型',
    text: '接口需兼容 POST /chat/completions，并接受 image_url 图片内容。',
  },
};

const PROMPT_PRESETS = {
  standard: '请结合图片和卖点，突出材质、适用场景、人群，提升点击转化率。',
  festival: '请突出节日/礼赠场景、图案主题与氛围，不写价格、销量、折扣。',
  param: '优先写清材质、尺寸、容量、结构等可验证参数，图片看不出的信息不要猜测。',
  brand: '保持简洁、克制的品牌语气，避免夸张词、极限词和平台违禁词。',
};

const TARGET_CATEGORY_LABELS = {
  generic: '通用素材',
  apparel: '服装 / 印花',
  home: '家居 / 装饰画',
  drinkware: '杯具 / 餐具',
  stationery: '文具 / 贴纸',
  custom: '自定义类目',
};

const VISION_SUPPORT = {
  demo: 'demo',
  qwen: 'vision',
  zhipu: 'vision',
  siliconflow: 'vision',
  doubao: 'vision',
  deepseek: 'vision',
  kimi: 'vision',
  gemini: 'vision',
  openai: 'vision',
  openrouter: 'depends',
  mistral: 'vision',
  ollama: 'vision',
  custom: 'depends',
};

const FALLBACK_PLATFORMS = [
  { id: 'taobao', short: '淘宝', name: '淘宝 / 天猫', lang: 'zh', maxChars: 30, maxBytes: 60, hint: '30 字以内 · 核心词前置', tone: '搜索词覆盖 + 点击欲' },
  { id: 'pdd', short: '拼多多', name: '拼多多', lang: 'zh', maxChars: 30, maxBytes: 60, hint: '30 字以内 · 直给卖点', tone: '利益点明确，少绕弯' },
  { id: 'douyin', short: '抖店', name: '抖音商城 / 抖店', lang: 'zh', maxChars: 30, maxBytes: 60, hint: '30 字以内 · 场景口语化', tone: '画面感 + 人群语境' },
  { id: 'jd', short: '京东', name: '京东', lang: 'zh', maxChars: 30, maxBytes: 60, hint: '30 字以内 · 参数清晰', tone: '规格、材质、型号优先' },
  { id: 'temu', short: 'TEMU', name: 'TEMU', lang: 'en', maxChars: 120, maxBytes: null, hint: '≤120 字符 · 自然英文', tone: '关键词 + 使用场景' },
  { id: 'amazon', short: 'Amazon', name: 'Amazon', lang: 'en', maxChars: 200, maxBytes: null, hint: '≤200 字符 · 可读性优先', tone: '核心词 + 属性 + 场景' },
];

const FALLBACK_STRATEGIES = [
  { id: 'flow', label: '流量型', short: '流量', desc: '大词覆盖，争取搜索曝光' },
  { id: 'convert', label: '转化型', short: '转化', desc: '卖点 + 场景，提升点击' },
  { id: 'brand', label: '品牌型', short: '品牌', desc: '品牌或调性背书' },
  { id: 'longtail', label: '长尾型', short: '长尾', desc: '细分场景，避开红海' },
];

const state = {
  platforms: [],
  strategies: [],
  samples: [],
  selectedPlatforms: new Set(['temu']),
  selectedStrategies: new Set(['flow', 'convert', 'longtail']),
  image: null,
  result: null,
  activePlatform: null,
  settings: { ...DEFAULT_SETTINGS },
  draft: null,
  rules: { ...DEFAULT_RULES },
  rulesDraft: null,
  batchMode: false,
  batch: {
    items: [],
    running: false,
    cancel: false,
    latestId: null,
    expanded: new Set(),
    startedAt: 0,
    filter: '',
    phase: 'idle',
    preprocess: { running: false, total: 0, done: 0 },
  },
  history: [],
  busy: false,
  envConfigured: false,
  envModel: '',
  loadingTimer: null,
  stepTimer: null,
  startedAt: 0,
  step: 0,
  sampleCache: new Map(),
  historyClearArmed: false,
  briefTimer: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const dom = {};

function el(tag, className, textValue) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textValue !== undefined) node.textContent = textValue;
  return node;
}

function icon(name, className = 'ico') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function recommendedConcurrency() {
  const cores = Number(navigator.hardwareConcurrency) || 4;
  const memory = Number(navigator.deviceMemory) || 8;
  let value = 2;
  if (cores >= 24) value = 8;
  else if (cores >= 16) value = 6;
  else if (cores >= 12) value = 5;
  else if (cores >= 8) value = 4;
  else if (cores >= 6) value = 3;
  if (memory <= 4) value = Math.min(value, 3);
  else if (memory <= 8) value = Math.min(value, 5);
  return Math.max(2, Math.min(8, value));
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatClock(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function isKeyOptional(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isModelReady(settings = state.settings) {
  if (settings.provider === 'env') return state.envConfigured;
  if (settings.provider === 'demo') return false;
  const hasAuth = Boolean(settings.apiKey) || settings.provider === 'ollama' || isKeyOptional(settings.baseUrl);
  return Boolean(settings.baseUrl && settings.model && hasAuth);
}

function readStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function loadSettings() {
  const stored = readStoredJson(STORAGE.settings, null);
  if (!stored || typeof stored !== 'object') return null;
  const providers = new Set([...PRESETS.map((preset) => preset.id), 'env']);
  const legacyDoubao = new Set([
    'doubao-1.5-vision-pro-32k-250115',
    'doubao-1-5-vision-pro-32k-250115',
  ]);
  let model = String(stored.model || '');
  if (stored.provider === 'doubao' && legacyDoubao.has(model)) {
    model = 'doubao-seed-1-6-vision-250815';
  }
  if (
    stored.provider === 'deepseek' &&
    ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-pro'].includes(model)
  ) {
    model = 'deepseek-flash';
  }
  if (
    stored.provider === 'kimi' &&
    (model.startsWith('moonshot-v1') || model === 'kimi-latest' || model === 'kimi-k2.5')
  ) {
    model = 'kimi-k3.1-pro';
  }
  return {
    provider: providers.has(stored.provider) ? stored.provider : 'custom',
    baseUrl: String(stored.baseUrl || ''),
    model,
    apiKey: String(stored.apiKey || ''),
    temperature: Number.isFinite(Number(stored.temperature))
      ? clamp(Number(stored.temperature), 0, 1)
      : 0.65,
  };
}

function normalizeClientRules(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const int = (value, min, max, fallback) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  };
  const pair = (minValue, maxValue, min, max, fallbackMin, fallbackMax) => {
    let low = int(minValue, min, max, fallbackMin);
    let high = int(maxValue, min, max, fallbackMax);
    if (low > high) [low, high] = [high, low];
    return [low, high];
  };
  const cleanText = (value, limit) =>
    String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
  const splitList = (value, limit, itemLength) => {
    const values = Array.isArray(value)
      ? value
      : String(value || '').split(/[\n,，、;；]+/);
    const seen = new Set();
    const result = [];
    for (const item of values) {
      const text = String(item || '').trim().slice(0, itemLength);
      if (!text || seen.has(text.toLowerCase())) continue;
      seen.add(text.toLowerCase());
      result.push(text);
      if (result.length >= limit) break;
    }
    return result;
  };

  const [titleMinZh, titleMaxZh] = pair(
    source.titleMinZh,
    source.titleMaxZh,
    4,
    30,
    DEFAULT_RULES.titleMinZh,
    DEFAULT_RULES.titleMaxZh,
  );
  const [titleMinEn, titleMaxEn] = pair(
    source.titleMinEn,
    source.titleMaxEn,
    10,
    200,
    DEFAULT_RULES.titleMinEn,
    DEFAULT_RULES.titleMaxEn,
  );
  const [descriptionMin, descriptionMax] = pair(
    source.descriptionMin,
    source.descriptionMax,
    10,
    500,
    DEFAULT_RULES.descriptionMin,
    DEFAULT_RULES.descriptionMax,
  );
  const [keywordMin, keywordMax] = pair(
    source.keywordMin,
    source.keywordMax,
    1,
    12,
    DEFAULT_RULES.keywordMin,
    DEFAULT_RULES.keywordMax,
  );

  return {
    titleMinZh,
    titleMaxZh,
    titleMinEn,
    titleMaxEn,
    descriptionMin,
    descriptionMax,
    keywordMin,
    keywordMax,
    mustInclude: splitList(source.mustInclude, 20, 24),
    bannedWords: splitList(source.bannedWords, 80, 24),
    keywordCombos: splitList(source.keywordCombos, 20, 80),
    assetMode: source.assetMode !== false,
    targetCategory: ['generic', 'apparel', 'home', 'drinkware', 'stationery', 'custom'].includes(
      source.targetCategory,
    )
      ? source.targetCategory
      : DEFAULT_RULES.targetCategory,
    targetCategoryLabel: cleanText(source.targetCategoryLabel, 40),
    titlePrefix: cleanText(source.titlePrefix, 24),
    titleSuffix: cleanText(source.titleSuffix, 24),
    targetLength: int(source.targetLength, 0, 200, DEFAULT_RULES.targetLength),
    language: ['auto', 'zh', 'en'].includes(source.language)
      ? source.language
      : DEFAULT_RULES.language,
    customPrompt: cleanText(source.customPrompt, 1200),
    imageMaxEdge: int(source.imageMaxEdge, 320, 4096, DEFAULT_RULES.imageMaxEdge),
    imageResizeMode: ['width', 'longest'].includes(source.imageResizeMode)
      ? source.imageResizeMode
      : DEFAULT_RULES.imageResizeMode,
    outputDir: cleanText(source.outputDir, 500),
    saveOriginalImages: source.saveOriginalImages !== false,
    concurrency: int(source.concurrency, 1, 20, DEFAULT_RULES.concurrency),
    concurrencyMode: ['auto', 'manual'].includes(source.concurrencyMode)
      ? source.concurrencyMode
      : DEFAULT_RULES.concurrencyMode,
  };
}

function loadRules() {
  const stored = readStoredJson(STORAGE.rules, null);
  const rules = normalizeClientRules(stored || {});
  if (rules.concurrencyMode === 'auto') rules.concurrency = recommendedConcurrency();
  return rules;
}

function renderRulesSummary() {
  if (!dom.rulesSummaryText) return;
  const rules = state.rules;
  const bits = [
    rules.assetMode ? '素材模式' : '商品标题',
    `中文 ${rules.titleMinZh}–${rules.titleMaxZh} 字`,
    `描述 ${rules.descriptionMin}–${rules.descriptionMax} 字`,
  ];
  if (rules.mustInclude.length) bits.push(`必含 ${rules.mustInclude.length}`);
  if (rules.bannedWords.length) bits.push(`禁用 ${rules.bannedWords.length}`);
  if (rules.keywordCombos.length) bits.push(`组合 ${rules.keywordCombos.length}`);
  bits.push(
    rules.concurrencyMode === 'auto'
      ? `并发自动 ${rules.concurrency}`
      : `并发 ${rules.concurrency}`,
  );
  dom.rulesSummaryText.textContent = bits.join(' · ');
  if (dom.rulesSummaryBtn) {
    dom.rulesSummaryBtn.title = [
      `中文标题 ${rules.titleMinZh}–${rules.titleMaxZh} 字`,
      `英文标题 ${rules.titleMinEn}–${rules.titleMaxEn} 字符`,
      `描述 ${rules.descriptionMin}–${rules.descriptionMax} 字`,
      `核心关键词 ${rules.keywordMin}–${rules.keywordMax} 个`,
      rules.mustInclude.length ? `必含：${rules.mustInclude.join('、')}` : '',
      rules.bannedWords.length ? `禁用：${rules.bannedWords.join('、')}` : '',
      rules.keywordCombos.length ? `关键词组合：${rules.keywordCombos.join('；')}` : '',
    ].filter(Boolean).join('\n');
  }
}

function fillRulesFields() {
  const rules = state.rulesDraft || state.rules;
  dom.ruleTitleMinZh.value = String(rules.titleMinZh);
  dom.ruleTitleMaxZh.value = String(rules.titleMaxZh);
  dom.ruleTitleMinEn.value = String(rules.titleMinEn);
  dom.ruleTitleMaxEn.value = String(rules.titleMaxEn);
  dom.ruleDescriptionMin.value = String(rules.descriptionMin);
  dom.ruleDescriptionMax.value = String(rules.descriptionMax);
  dom.ruleKeywordMin.value = String(rules.keywordMin);
  dom.ruleKeywordMax.value = String(rules.keywordMax);
  dom.ruleMustInclude.value = rules.mustInclude.join('\n');
  dom.ruleKeywordCombos.value = rules.keywordCombos.join('\n');
  dom.ruleBannedWords.value = rules.bannedWords.join('\n');
  dom.ruleConcurrency.value =
    rules.concurrencyMode === 'auto' ? 'auto' : String(rules.concurrency);
}

function openRules() {
  openDrawer(dom.rulesDrawer);
  state.rulesDraft = {
    ...state.rules,
    mustInclude: [...state.rules.mustInclude],
    bannedWords: [...state.rules.bannedWords],
    keywordCombos: [...state.rules.keywordCombos],
  };
  fillRulesFields();
}

function readRulesFields() {
  return normalizeClientRules({
    titleMinZh: dom.ruleTitleMinZh.value,
    titleMaxZh: dom.ruleTitleMaxZh.value,
    titleMinEn: dom.ruleTitleMinEn.value,
    titleMaxEn: dom.ruleTitleMaxEn.value,
    descriptionMin: dom.ruleDescriptionMin.value,
    descriptionMax: dom.ruleDescriptionMax.value,
    keywordMin: dom.ruleKeywordMin.value,
    keywordMax: dom.ruleKeywordMax.value,
    mustInclude: dom.ruleMustInclude.value,
    keywordCombos: dom.ruleKeywordCombos.value,
    bannedWords: dom.ruleBannedWords.value,
    concurrency:
      dom.ruleConcurrency.value === 'auto'
        ? recommendedConcurrency()
        : dom.ruleConcurrency.value,
    concurrencyMode: dom.ruleConcurrency.value === 'auto' ? 'auto' : 'manual',
    assetMode: state.rules.assetMode,
    targetCategory: state.rules.targetCategory,
    targetCategoryLabel: state.rules.targetCategoryLabel,
    titlePrefix: state.rules.titlePrefix,
    titleSuffix: state.rules.titleSuffix,
    targetLength: state.rules.targetLength,
    language: state.rules.language,
    customPrompt: state.rules.customPrompt,
    imageMaxEdge: state.rules.imageMaxEdge,
    imageResizeMode: state.rules.imageResizeMode,
    outputDir: state.rules.outputDir,
    saveOriginalImages: state.rules.saveOriginalImages,
  });
}

function saveRules() {
  state.rules = readRulesFields();
  writeStoredJson(STORAGE.rules, state.rules);
  renderRulesSummary();
  syncBatchSettings();
  syncTargetCategoryFields();
  updateGenerateMeta();
  closeDrawers();
  toast('生成规则已保存', 'success');
}

function syncBatchSettings() {
  if (!dom.batchPrefix) return;
  const rules = state.rules;
  const assetMode = rules.assetMode !== false ? 'asset' : 'product';
  if (dom.batchAssetMode.value !== assetMode) dom.batchAssetMode.value = assetMode;
  if (dom.batchPrefix.value !== rules.titlePrefix) dom.batchPrefix.value = rules.titlePrefix || '';
  if (dom.batchSuffix.value !== rules.titleSuffix) dom.batchSuffix.value = rules.titleSuffix || '';
  if (dom.batchImageEdge.value !== String(rules.imageMaxEdge)) {
    dom.batchImageEdge.value = String(rules.imageMaxEdge);
  }
  if (dom.batchResizeMode.value !== rules.imageResizeMode) {
    dom.batchResizeMode.value = rules.imageResizeMode;
  }
  const autoConcurrency = recommendedConcurrency();
  const autoOption = [...dom.batchConcurrency.options].find(
    (option) => option.value === 'auto',
  );
  if (autoOption) autoOption.textContent = `自动（推荐 ${autoConcurrency} 张/次）`;
  const concurrency =
    rules.concurrencyMode === 'auto' ? 'auto' : String(rules.concurrency);
  if (
    concurrency !== 'auto' &&
    ![...dom.batchConcurrency.options].some((option) => option.value === concurrency)
  ) {
    const option = el('option', '', `${concurrency} 张 / 次`);
    option.value = concurrency;
    dom.batchConcurrency.append(option);
  }
  if (dom.batchConcurrency.value !== concurrency) dom.batchConcurrency.value = concurrency;
  if (dom.batchCustomPrompt.value !== rules.customPrompt) {
    dom.batchCustomPrompt.value = rules.customPrompt || '';
  }
  const promptPreset = Object.entries(PROMPT_PRESETS)
    .find(([, text]) => text === rules.customPrompt)?.[0] || 'custom';
  if (dom.batchPromptPreset.value !== promptPreset) {
    dom.batchPromptPreset.value = promptPreset;
  }
  if (dom.batchTargetLength.value !== String(rules.targetLength)) {
    dom.batchTargetLength.value = String(rules.targetLength);
  }
  if (dom.batchLanguage.value !== rules.language) dom.batchLanguage.value = rules.language;
  if (dom.batchBannedWords.value !== rules.bannedWords.join('\n')) {
    dom.batchBannedWords.value = rules.bannedWords.join('\n');
  }
  if (dom.batchOutputDir.value !== (rules.outputDir || '')) {
    dom.batchOutputDir.value = rules.outputDir || '';
  }
  dom.batchSaveOriginals.checked = rules.saveOriginalImages !== false;
}

async function chooseBatchOutputDir() {
  if (typeof window.desktop?.selectDirectory !== 'function') {
    toast('当前环境不支持选择保存位置，请在导出时选择');
    return;
  }
  try {
    const result = await window.desktop.selectDirectory({
      title: '选择批量结果默认保存位置',
    });
    if (!result?.ok) {
      if (!result?.canceled) toast(result?.error || '选择文件夹失败', 'error');
      return;
    }
    state.rules.outputDir = result.path;
    writeStoredJson(STORAGE.rules, state.rules);
    syncBatchSettings();
    toast('已设置默认保存位置', 'success');
  } catch (error) {
    toast(error.message || '选择文件夹失败', 'error');
  }
}

function syncTargetCategoryFields() {
  if (!dom.targetCategorySelect) return;
  const category = state.rules.targetCategory || 'generic';
  dom.targetCategorySelect.value = category;
  dom.customCategoryWrap.hidden = category !== 'custom';
  if (dom.customCategoryInput.value !== (state.rules.targetCategoryLabel || '')) {
    dom.customCategoryInput.value = state.rules.targetCategoryLabel || '';
  }
}

function saveTargetCategory() {
  state.rules.targetCategory = dom.targetCategorySelect.value || 'generic';
  state.rules.targetCategoryLabel =
    state.rules.targetCategory === 'custom' ? dom.customCategoryInput.value : '';
  state.rules = normalizeClientRules(state.rules);
  writeStoredJson(STORAGE.rules, state.rules);
  syncTargetCategoryFields();
  updateGenerateMeta();
}

function invalidateBatchPreprocess() {
  if (state.batch.running || state.batch.preprocess?.running) return;
  let changed = false;
  for (const item of state.batch.items) {
    if (!item.file || item.status === 'done') continue;
    item.dataUrl = null;
    item.preprocessState = 'pending';
    item.preprocessError = '';
    item.processedSize = 0;
    item.processedWidth = 0;
    item.processedHeight = 0;
    changed = true;
  }
  state.batch.preprocess = { running: false, total: 0, done: 0 };
  if (changed) renderBatch();
}

function readBatchFields() {
  if (!dom.batchPrefix) return;
  const previousImageEdge = state.rules.imageMaxEdge;
  const previousResizeMode = state.rules.imageResizeMode;
  state.rules = normalizeClientRules({
    ...state.rules,
    assetMode: dom.batchAssetMode.value === 'asset',
    titlePrefix: dom.batchPrefix.value,
    titleSuffix: dom.batchSuffix.value,
    concurrency:
      dom.batchConcurrency.value === 'auto'
        ? recommendedConcurrency()
        : dom.batchConcurrency.value,
    concurrencyMode: dom.batchConcurrency.value === 'auto' ? 'auto' : 'manual',
    imageMaxEdge: dom.batchImageEdge.value,
    imageResizeMode: dom.batchResizeMode.value,
    targetLength: dom.batchTargetLength.value,
    language: dom.batchLanguage.value,
    bannedWords: dom.batchBannedWords.value,
    customPrompt: dom.batchCustomPrompt.value,
    outputDir: dom.batchOutputDir.value,
    saveOriginalImages: dom.batchSaveOriginals.checked,
  });
  writeStoredJson(STORAGE.rules, state.rules);
  renderRulesSummary();
  if (
    previousImageEdge !== state.rules.imageMaxEdge ||
    previousResizeMode !== state.rules.imageResizeMode
  ) {
    invalidateBatchPreprocess();
  }
}

function buildBatchTemplate() {
  readBatchFields();
  return {
    app: 'KuaduoTitleWorkshop',
    type: 'batch-template',
    version: 1,
    savedAt: new Date().toISOString(),
    batchName: dom.batchFileName.value.trim(),
    platforms: [...state.selectedPlatforms],
    strategies: [...state.selectedStrategies],
    // 只保存生成参数，不包含 API Key。
    rules: { ...state.rules },
  };
}

async function saveBatchTemplate() {
  const template = buildBatchTemplate();
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const base = sanitizeFileName(
    `跨多多标题工坊-模板-${template.batchName || stamp}`,
    `跨多多标题工坊-模板-${stamp}`,
  ).replace(/\.json$/i, '');
  const content = JSON.stringify(template, null, 2);
  try {
    if (DESKTOP) {
      const saved = await window.desktop.saveTextFile({
        title: '保存批量模板',
        defaultName: `${base}.json`,
        extension: 'json',
        content,
        outputDir: state.rules.outputDir || '',
        filters: [{ name: '跨多多标题工坊模板', extensions: ['json'] }],
      });
      if (saved?.ok) {
        toast(
          saved.fallback
            ? `原位置无权限，模板已改存到 ${saved.path}`
            : '模板已保存，可放到任意盘复用',
          'success',
        );
      } else if (!saved?.canceled) {
        toast(saved?.error || '模板保存失败', 'error');
      }
    } else {
      downloadBlob(
        new Blob([content], { type: 'application/json;charset=utf-8' }),
        `${base}.json`,
      );
      toast('模板已导出', 'success');
    }
  } catch (error) {
    toast(error.message || '模板保存失败', 'error');
  }
}

async function applyBatchTemplate(data) {
  if (!data || data.type !== 'batch-template' || !data.rules || typeof data.rules !== 'object') {
    throw new Error('不是有效的跨多多标题工坊模板');
  }
  state.rules = normalizeClientRules({ ...DEFAULT_RULES, ...data.rules });
  if (state.rules.concurrencyMode === 'auto') {
    state.rules.concurrency = recommendedConcurrency();
  }
  writeStoredJson(STORAGE.rules, state.rules);

  const platformIds = new Set(state.platforms.map((platform) => platform.id));
  const platforms = Array.isArray(data.platforms)
    ? data.platforms.filter((id) => platformIds.has(id))
    : [];
  if (platforms.length) state.selectedPlatforms = new Set(platforms);

  const strategyIds = new Set(state.strategies.map((strategy) => strategy.id));
  const strategies = Array.isArray(data.strategies)
    ? data.strategies.filter((id) => strategyIds.has(id)).slice(0, 3)
    : [];
  if (strategies.length) state.selectedStrategies = new Set(strategies);

  if (data.batchName) dom.batchFileName.value = String(data.batchName).slice(0, 80);

  renderPlatformChips();
  renderStrategyChips();
  renderRulesSummary();
  syncBatchSettings();
  syncTargetCategoryFields();
  updateGenerateMeta();
  renderBatch();
  toast('模板已载入，参数和尺寸设置已恢复', 'success');
}

async function loadBatchTemplateFile(file) {
  if (!file) return;
  if (file.size > 1024 * 1024) throw new Error('模板文件过大');
  const text = await file.text();
  await applyBatchTemplate(JSON.parse(text));
}

function loadHistory() {
  const stored = readStoredJson(STORAGE.history, []);
  return Array.isArray(stored)
    ? stored.filter((item) => item && item.result && item.result.titles?.length)
    : [];
}

function cacheDom() {
  const ids = [
    'dropzone', 'dropEmpty', 'dropTitle', 'dropHint', 'dropKbd', 'fileInput', 'dropPreview',
    'previewImg', 'previewDims', 'previewSize', 'changeImage', 'removeImage', 'scanLine',
    'sampleList', 'categoryInput', 'targetCategorySelect', 'customCategoryWrap',
    'customCategoryInput', 'brandInput', 'sellingInput', 'audienceInput',
    'platformChips', 'strategyChips', 'generateBtn', 'generateMeta', 'resultHeading',
    'resultSub', 'resultTools', 'regenerateBtn', 'exportBtn', 'emptyState', 'loadingState',
    'loadingImg', 'loadingTitle', 'loadingSub', 'loadingSteps', 'elapsed', 'errorState',
    'errorTitle', 'errorMessage', 'errorDetailWrap', 'errorDetail', 'retryBtn',
    'errorSettingsBtn', 'resultContent', 'demoBanner', 'demoText', 'demoConfigBtn',
    'insightCard', 'platformTabs', 'listMeta', 'titleList', 'descriptionPanel',
    'keywordsPanel', 'compliancePanel', 'resultModel', 'resultFootNote', 'settingsDrawer',
    'settingsTitle', 'closeSettings', 'presetGrid', 'baseUrlInput', 'modelInput',
    'apiKeyInput', 'modelHint', 'toggleKey', 'temperatureInput', 'tempOutput', 'testBtn', 'testResult',
    'useDemoBtn', 'saveSettingsBtn', 'historyDrawer', 'closeHistory', 'historyList',
    'clearHistory', 'historyCount', 'drawerBackdrop', 'helpDialog', 'closeHelp',
    'helpCloseBtn', 'toastRegion', 'modelPill', 'modelPillText', 'settingsBtn',
    'crumbCurrent', 'topMenu', 'resultBody', 'modeSwitch', 'batchImport', 'folderInput',
    'batchFileInput', 'pickFolderBtn', 'pickBatchFilesBtn', 'loadSampleBatchBtn',
    'batchMini', 'rulesSummaryBtn', 'rulesSummaryText', 'rulesDrawer', 'closeRules',
    'ruleTitleMinZh', 'ruleTitleMaxZh', 'ruleTitleMinEn', 'ruleTitleMaxEn',
    'ruleDescriptionMin', 'ruleDescriptionMax', 'ruleKeywordMin', 'ruleKeywordMax',
    'ruleMustInclude', 'ruleKeywordCombos', 'ruleBannedWords', 'ruleConcurrency',
    'saveRulesBtn', 'resetRulesBtn', 'openRulesFromSettings', 'batchView',
    'batchSummaryText', 'batchStartBtn', 'batchPreprocessBtn', 'batchStopBtn',
    'batchPreviewBtn', 'batchExcelBtn',
    'batchPreviewModal', 'batchPreviewClose', 'batchPreviewSummary',
    'batchPreviewTree', 'batchPreviewFrame', 'batchPreviewSaveBtn', 'batchPreviewExcelBtn',
    'batchCsvBtn', 'batchFolderBtn', 'batchClearBtn', 'batchFilterInput',
    'batchFilterClear', 'batchFilterCount', 'batchProgressBar',
    'batchStats', 'batchFileName',
    'batchSettings', 'batchPrefix', 'batchSuffix', 'batchConcurrency',
    'batchResizeMode', 'batchImageEdge',
    'batchAssetMode', 'batchTargetLength', 'batchLanguage', 'batchBannedWords', 'batchPromptPreset',
    'batchCustomPrompt', 'batchOutputDir', 'batchChooseDir', 'batchSaveOriginals',
    'batchSaveSettingsBtn', 'batchRulesBtn', 'batchSaveTemplateBtn',
    'batchLoadTemplateBtn', 'templateFileInput',
    'batchPreprocessStatus', 'batchLive', 'batchList', 'batchEmpty',
    'emptyPickFolderBtn', 'emptyLoadSamplesBtn',
    'briefTitle', 'generateWrap',
  ];
  for (const id of ids) dom[id] = document.getElementById(id);
  dom.briefCol = $('.brief-col');
  dom.briefScroll = $('.brief-scroll');
  dom.resultCol = $('.result-col');
  dom.sampleRow = $('.sample-row');
}

async function getJson(url, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error?.message || `请求失败 (${response.status})`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(url, body, timeoutMs = 150_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('请求超时，请重试或换一个更快的模型');
      timeoutError.code = 'CLIENT_TIMEOUT';
      throw timeoutError;
    }
    const networkError = new Error('连接不到本地服务，请确认启动窗口仍在运行');
    networkError.code = 'NETWORK';
    throw networkError;
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!data) {
    const error = new Error(`本地服务返回了无法解析的数据 (${response.status})`);
    error.code = 'BAD_LOCAL_RESPONSE';
    throw error;
  }
  if (!response.ok || data?.ok === false) {
    const error = new Error(data?.error?.message || `请求失败 (${response.status})`);
    error.code = data?.error?.code || `HTTP_${response.status}`;
    error.detail = data?.error?.detail || '';
    error.status = response.status;
    throw error;
  }
  return data;
}

async function loadMeta() {
  const [platformResult, sampleResult, healthResult] = await Promise.allSettled([
    getJson('/api/platforms'),
    getJson('/api/samples'),
    getJson('/api/health'),
  ]);

  state.platforms = platformResult.status === 'fulfilled' && Array.isArray(platformResult.value.platforms)
    ? platformResult.value.platforms
    : FALLBACK_PLATFORMS;
  state.strategies = platformResult.status === 'fulfilled' && Array.isArray(platformResult.value.strategies)
    ? platformResult.value.strategies
    : FALLBACK_STRATEGIES;
  state.samples = sampleResult.status === 'fulfilled' && Array.isArray(sampleResult.value.samples)
    ? sampleResult.value.samples
    : [];

  if (healthResult.status === 'fulfilled') {
    state.envConfigured = Boolean(healthResult.value.envConfigured);
    state.envModel = String(healthResult.value.envModel || '');
  }

  const available = new Set(state.platforms.map((platform) => platform.id));
  state.selectedPlatforms = new Set(
    [...state.selectedPlatforms].filter((id) => available.has(id)),
  );
  if (!state.selectedPlatforms.size) {
    state.selectedPlatforms.add(state.platforms[0]?.id || 'taobao');
  }
}

/* ------------------------------------------------------------------ */
/*  rendering: input side                                             */
/* ------------------------------------------------------------------ */

function renderPlatformChips() {
  dom.platformChips.replaceChildren();
  for (const platform of state.platforms) {
    const selected = state.selectedPlatforms.has(platform.id);
    const button = el('button', `chip${selected ? ' is-selected' : ''}`);
    button.type = 'button';
    button.dataset.id = platform.id;
    button.setAttribute('aria-pressed', String(selected));
    button.title = platform.hint || platform.name;
    button.append(el('span', 'chip-dot'), el('span', '', platform.short));
    button.addEventListener('click', () => togglePlatform(platform.id));
    dom.platformChips.append(button);
  }
  updateGenerateMeta();
}

function togglePlatform(id) {
  if (state.selectedPlatforms.has(id)) {
    if (state.selectedPlatforms.size === 1) {
      toast('至少保留一个发布平台');
      return;
    }
    state.selectedPlatforms.delete(id);
  } else {
    state.selectedPlatforms.add(id);
  }
  renderPlatformChips();
  if (state.result) {
    renderTabs();
    renderTitles();
    renderKeywords();
    renderCompliance();
  }
}

function renderStrategyChips() {
  dom.strategyChips.replaceChildren();
  const hasBrand = Boolean(dom.brandInput.value.trim());
  if (!hasBrand) state.selectedStrategies.delete('brand');
  for (const strategy of state.strategies) {
    const selected = state.selectedStrategies.has(strategy.id);
    const disabled = strategy.id === 'brand' && !hasBrand;
    const button = el(
      'button',
      `chip${selected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`,
    );
    button.type = 'button';
    button.dataset.id = strategy.id;
    button.setAttribute('aria-pressed', String(selected));
    button.title = disabled
      ? '填写品牌名后可用；没有品牌时不让模型虚构品牌'
      : strategy.desc || '';
    button.append(el('span', 'chip-dot'), el('span', '', strategy.label));
    if (disabled) button.disabled = true;
    button.addEventListener('click', () => toggleStrategy(strategy.id));
    dom.strategyChips.append(button);
  }
  updateGenerateMeta();
}

function toggleStrategy(id) {
  const strategy = state.strategies.find((item) => item.id === id);
  if (id === 'brand' && !dom.brandInput.value.trim()) {
    toast('先在品牌字段填写品牌名，或选其他策略');
    return;
  }
  if (state.selectedStrategies.has(id)) {
    if (state.selectedStrategies.size === 1) {
      toast('至少保留一个标题策略');
      return;
    }
    state.selectedStrategies.delete(id);
  } else {
    if (state.selectedStrategies.size >= 3) {
      toast('最多选择 3 个策略，先取消一个');
      return;
    }
    state.selectedStrategies.add(id);
  }
  renderStrategyChips();
}

function updateGenerateMeta() {
  if (!dom.generateMeta) return;
  if (state.batchMode) {
    const total = state.batch.items.length;
    const done = state.batch.items.filter((item) => item.status === 'done').length;
    dom.generateMeta.textContent = total
      ? `${done} / ${total} 已完成`
      : '先导入图片';
    return;
  }
  const platformNames = state.platforms
    .filter((platform) => state.selectedPlatforms.has(platform.id))
    .map((platform) => platform.short);
  const count = platformNames.length * state.selectedStrategies.size;
  let summary;
  if (platformNames.length > 3) {
    summary = `${platformNames.slice(0, 2).join(' · ')} 等 ${platformNames.length} 个平台`;
  } else if (platformNames.length) {
    summary = platformNames.join(' · ');
  } else {
    summary = '先选平台';
  }
  dom.generateMeta.textContent = `${summary} / ${count} 条`;
}

function renderSamples() {
  dom.sampleList.replaceChildren();
  if (!state.samples.length) {
    dom.sampleRow.hidden = true;
    return;
  }
  dom.sampleRow.hidden = false;
  for (const sample of state.samples) {
    const button = el('button', 'sample-btn');
    button.type = 'button';
    button.dataset.id = sample.id;
    button.title = `${sample.name} · ${sample.category}`;
    button.setAttribute('aria-label', `使用示例：${sample.name}`);
    const img = el('img');
    img.src = sample.file;
    img.alt = sample.label || sample.name;
    img.loading = 'lazy';
    button.append(img, el('span', '', sample.label));
    button.addEventListener('click', () => selectSample(sample.id));
    dom.sampleList.append(button);
  }
}

function setMode(mode) {
  if (mode === 'single' && state.batch.running) {
    toast('批量正在处理，先停止再切回单张');
    return;
  }
  if (mode === 'batch' && state.busy) {
    toast('单张正在生成，等它完成再切到批量');
    return;
  }
  state.batchMode = mode === 'batch';
  document.documentElement.classList.toggle('is-batch', state.batchMode);
  updateModeUi();
  if (state.batchMode) {
    renderBatch();
  } else {
    showSingleWorkspace();
  }
}

function updateModeUi() {
  $$('button', dom.modeSwitch).forEach((button) => {
    const active = (button.dataset.mode === 'batch') === state.batchMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  dom.briefTitle.innerHTML = state.batchMode
    ? '一批商品图，<br><em>批量写出平台标题。</em>'
    : '一张商品图，<br><em>写出六种平台语气。</em>';
  const lede = $('.lede');
  if (lede) {
    lede.textContent = state.batchMode
      ? '整文件夹导入，逐张识别关键词与卖点；每完成一张，右侧实时出现匹配标题、描述与字数检查。'
      : '识别主体与卖点，按平台规则收束字数，直接得到能上架的标题。';
  }
  dom.batchImport.hidden = !state.batchMode;
  dom.dropTitle.textContent = state.batchMode
    ? '拖入图片或文件夹，或点击选择'
    : '拖入商品图，或点击上传';
  dom.dropHint.textContent = state.batchMode
    ? 'JPG / PNG / WebP · 不限张数 · 逐张处理'
    : 'JPG / PNG / WebP · 建议 800px 以上';
  dom.dropKbd.textContent = state.batchMode ? '多选' : 'Ctrl V';
  const kbd = $('kbd', dom.generateBtn);
  if (kbd) kbd.hidden = state.batchMode;
  dom.generateBtn.classList.toggle('is-batch', state.batchMode);
  updateBatchPrimary();
  updateGenerateMeta();
}

function updateBatchPrimary() {
  if (!state.batchMode) return;
  const total = state.batch.items.length;
  const done = state.batch.items.filter((item) => item.status === 'done').length;
  const failed = state.batch.items.filter((item) => item.status === 'error').length;
  const allDone = total > 0 && done === total;
  dom.generateBtn.disabled = state.batch.running || total === 0 || allDone;
  dom.generateBtn.classList.toggle('is-busy', state.batch.running);
  $('.btn-text', dom.generateBtn).textContent = state.batch.running
    ? '批量处理中'
    : allDone
      ? '本批已完成'
      : failed > 0 && done + failed === total
        ? '重试失败项'
        : total
          ? '开始批量处理'
          : '先导入图片';
  dom.generateMeta.textContent = total ? `${done} / ${total} 已完成` : '先导入图片';
}

function showSingleWorkspace() {
  dom.batchView.hidden = true;
  if (state.result) {
    dom.emptyState.hidden = true;
    dom.errorState.hidden = true;
    dom.resultContent.hidden = false;
    dom.resultTools.hidden = false;
    dom.resultHeading.textContent = state.result.product?.name || '生成完成';
    dom.resultSub.textContent = `${state.result.titleCount || state.result.titles?.length || 0} 条标题 · ${state.result.meta?.demo ? '内置示例' : state.result.meta?.model || '视觉模型'}`;
    dom.crumbCurrent.textContent = state.result.product?.name || '生成结果';
  } else if (state.image) {
    resetResult(true);
  } else {
    resetResult(false);
  }
}

function isSupportedImageFile(file) {
  if (!file) return false;
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name || '');
}

function addBatchFiles(files, options = {}) {
  if (state.busy) {
    toast('单张正在生成，稍后再导入批量');
    return 0;
  }
  const incoming = [...(files || [])].filter(isSupportedImageFile);
  if (!incoming.length) {
    toast('没有找到 JPG / PNG / WebP 图片', 'error');
    return 0;
  }
  const accepted = incoming;
  for (const [index, file] of accepted.entries()) {
    if (file.size > 15 * 1024 * 1024) {
      toast(`已跳过 ${file.name}：超过 15MB`, 'error');
      continue;
    }
    state.batch.items.push({
      id: `batch-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      sampleId: null,
      name: file.name || `image-${index + 1}.jpg`,
      sku: String(file.name || `image-${index + 1}`).replace(/\.[a-z0-9]+$/i, '').trim(),
      selectedTitleIndexes: new Set(),
      previewUrl: URL.createObjectURL(file),
      status: 'queued',
      result: null,
      error: '',
      dataUrl: null,
      width: 0,
      height: 0,
      originalSize: file.size || 0,
      processedSize: 0,
      processedWidth: 0,
      processedHeight: 0,
      preprocessState: 'pending',
      preprocessError: '',
      addedAt: Date.now(),
      finishedAt: 0,
    });
  }
  if (!state.batchMode) setMode('batch');
  else renderBatch();
  toast(`已加入 ${accepted.length} 张图片${incoming.length > accepted.length ? `，超出上限的 ${incoming.length - accepted.length} 张未加入` : ''}`);
  return accepted.length;
}

function addBatchSample(sample, silent = false) {
  if (!sample) return;
  if (state.batch.items.some((item) => item.sampleId === sample.id)) {
    if (!silent) toast('这个示例已经在队列里');
    return;
  }

  state.batch.items.push({
    id: `batch-${Date.now()}-${sample.id}`,
    file: null,
    sampleId: sample.id,
    name: `${sample.label || sample.id}.svg`,
    sku: sample.label || sample.id,
    selectedTitleIndexes: new Set(),
    previewUrl: sample.file,
    status: 'queued',
    result: null,
    error: '',
    dataUrl: null,
    width: 1200,
    height: 1200,
    originalSize: 0,
    processedSize: 0,
    processedWidth: 1200,
    processedHeight: 1200,
    preprocessState: 'done',
    preprocessError: '',
    addedAt: Date.now(),
    finishedAt: 0,
  });
  if (!state.batchMode) setMode('batch');
  else renderBatch();
  if (!silent) toast(`已加入示例：${sample.name}`);
}

function addBatchSamples(silent = false) {
  if (!state.samples.length) {
    if (!silent) toast('示例还没有加载好', 'error');
    return;
  }
  const missing = state.samples.filter(
    (sample) => !state.batch.items.some((item) => item.sampleId === sample.id),
  );
  if (!missing.length) {
    if (!silent) toast('4 个示例都已在队列里');
    return;
  }
  for (const sample of missing) addBatchSample(sample, true);
  if (!silent) toast(`已载入 ${missing.length} 个示例`);
}

function updatePreviewUI() {
  if (!state.image?.previewUrl) {
    dom.dropPreview.hidden = true;
    dom.dropEmpty.hidden = false;
    dom.dropzone.classList.remove('has-image');
    return;
  }
  dom.previewImg.src = state.image.previewUrl;
  dom.previewImg.alt = state.image.name ? `${state.image.name} 预览` : '商品图预览';
  dom.previewDims.textContent =
    state.image.width && state.image.height
      ? `${state.image.width} × ${state.image.height}`
      : '商品图';
  dom.previewSize.textContent = state.image.sampleId
    ? '示例素材'
    : state.image.size
      ? formatBytes(state.image.size)
      : '';
  dom.dropPreview.hidden = false;
  dom.dropEmpty.hidden = true;
  dom.dropzone.classList.add('has-image');
}

function selectSample(id) {
  if (state.busy) return;
  const sample = state.samples.find((item) => item.id === id);
  if (!sample) return;
  if (state.batchMode) {
    addBatchSample(sample);
    return;
  }
  state.image = {
    sampleId: sample.id,
    previewUrl: sample.file,
    dataUrl: null,
    width: 1200,
    height: 1200,
    name: sample.name,
    size: 0,
  };
  fillBriefFromSample(sample);
  updatePreviewUI();
  $$('.sample-btn', dom.sampleList).forEach((button) => {
    button.classList.toggle('is-active', button.dataset.id === id);
  });
  resetResult(true);
}

function fillBriefFromSample(sample) {
  const brief = sample.brief || {};
  dom.categoryInput.value = brief.category || '';
  dom.brandInput.value = brief.brand || '';
  dom.sellingInput.value = brief.sellingPoints || '';
  dom.audienceInput.value = brief.audience || '';
  saveBriefSoon();
  renderStrategyChips();
}

function collectBrief() {
  return {
    category: dom.categoryInput.value.trim(),
    brand: dom.brandInput.value.trim(),
    sellingPoints: dom.sellingInput.value.trim(),
    audience: dom.audienceInput.value.trim(),
  };
}

function restoreBrief() {
  const brief = readStoredJson(STORAGE.brief, null);
  if (!brief || typeof brief !== 'object') return;
  dom.categoryInput.value = String(brief.category || '');
  dom.brandInput.value = String(brief.brand || '');
  dom.sellingInput.value = String(brief.sellingPoints || '');
  dom.audienceInput.value = String(brief.audience || '');
}

function saveBriefSoon() {
  clearTimeout(state.briefTimer);
  state.briefTimer = setTimeout(() => {
    writeStoredJson(STORAGE.brief, collectBrief());
  }, 250);
}

/* ------------------------------------------------------------------ */
/*  image handling                                                    */
/* ------------------------------------------------------------------ */

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = src;
  });
}

async function processImageFile(file, maxSide = 1280, resizeMode = 'width') {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('请选择 JPG、PNG 或 WebP 图片');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('只支持 JPG、PNG 或 WebP');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('图片超过 15MB，请先压缩');
  }

  let bitmap;
  if (typeof createImageBitmap === 'function') {
    bitmap = await createImageBitmap(file);
  } else {
    const url = URL.createObjectURL(file);
    try {
      bitmap = await loadImageElement(url);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  const width = bitmap.width;
  const height = bitmap.height;
  const sideLimit = clamp(Number(maxSide) || 1280, 320, 4096);
  const scale = resizeMode === 'width'
    ? Math.min(1, sideLimit / width)
    : Math.min(1, sideLimit / Math.max(width, height));
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

async function handleFile(file) {
  if (state.batchMode) {
    addBatchFiles([file]);
    return;
  }
  if (state.busy) {
    toast('正在生成，稍等一下');
    return;
  }
  try {
    const image = await processImageFile(
      file,
      state.rules.imageMaxEdge,
      state.rules.imageResizeMode,
    );
    state.image = image;
    updatePreviewUI();
    $$('.sample-btn', dom.sampleList).forEach((button) => button.classList.remove('is-active'));
    resetResult(true);
    if (image.width < 500 || image.height < 500) {
      toast('图片尺寸偏小，建议换一张 800px 以上的图');
    } else {
      toast('图片已就绪');
    }
  } catch (error) {
    toast(error.message || '图片读取失败', 'error');
  } finally {
    dom.fileInput.value = '';
  }
}

async function sampleImageData(sampleId) {
  if (!sampleId) throw new Error('这张历史图需要重新上传后才能生成');
  if (state.sampleCache.has(sampleId)) return state.sampleCache.get(sampleId);
  const sample = state.samples.find((item) => item.id === sampleId);
  if (!sample) throw new Error('找不到示例图');
  const response = await fetch(sample.file);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImageElement(url);
    const size = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.fillStyle = '#f4efe5';
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    state.sampleCache.set(sampleId, dataUrl);
    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function ensureAnalysisImage() {
  if (state.image?.dataUrl) return state.image.dataUrl;
  if (state.image?.sampleId) {
    const dataUrl = await sampleImageData(state.image.sampleId);
    state.image.dataUrl = dataUrl;
    return dataUrl;
  }
  throw new Error('图片已失效，请重新上传');
}

async function makeThumb(src, size = 320, quality = 0.72, cover = true) {
  const image = await loadImageElement(src);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f4efe5';
  context.fillRect(0, 0, size, size);
  if (cover) {
    const scale = Math.max(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  } else {
    context.drawImage(image, 0, 0, size, size);
  }
  return canvas.toDataURL('image/jpeg', quality);
}

function clearImage() {
  if (state.busy) return;
  state.image = null;
  dom.previewImg.removeAttribute('src');
  updatePreviewUI();
  $$('.sample-btn', dom.sampleList).forEach((button) => button.classList.remove('is-active'));
  resetResult(false);
}

/* ------------------------------------------------------------------ */
/*  loading / result shell                                            */
/* ------------------------------------------------------------------ */

function resetResult(hasImage) {
  state.result = null;
  state.activePlatform = null;
  dom.emptyState.hidden = false;
  dom.loadingState.hidden = true;
  dom.errorState.hidden = true;
  dom.resultContent.hidden = true;
  dom.resultTools.hidden = true;
  dom.resultHeading.textContent = hasImage ? '准备生成' : '等待一张商品图';
  dom.resultSub.textContent = hasImage
    ? '确认平台与策略后，点击「生成标题」。'
    : '上传后约 15–40 秒，具体取决于模型速度。';
  dom.crumbCurrent.textContent = '新建任务';
  state.busy = false;
  setGenerateBusy(false);
}

const LOADING_COPY = [
  ['正在看材质与轮廓…', '先确认品类，再拆解卖点与场景。'],
  ['正在提取属性与卖点…', '材质、容量、结构，只写图里能确认的。'],
  ['正在按平台收束字数…', '同一件商品，淘宝要搜索，TEMU 要自然英文。'],
  ['正在检查极限词…', '最后过一遍合规与可读性。'],
];

function setLoadingStep(step) {
  state.step = step;
  const items = $$('#loadingSteps li');
  items.forEach((item, index) => {
    item.classList.toggle('is-done', index < step);
    item.classList.toggle('is-active', index === step);
  });
  const copy = LOADING_COPY[Math.min(step, LOADING_COPY.length - 1)];
  dom.loadingTitle.textContent = copy[0];
  dom.loadingSub.textContent = copy[1];
}

function startLoading() {
  state.startedAt = Date.now();
  state.step = 0;
  dom.emptyState.hidden = true;
  dom.errorState.hidden = true;
  dom.resultContent.hidden = true;
  dom.loadingState.hidden = false;
  dom.resultTools.hidden = true;
  dom.resultHeading.textContent = '正在读这张图';
  dom.resultSub.textContent = '通常 15–40 秒，具体取决于模型速度。';
  dom.crumbCurrent.textContent = '生成中';
  dom.dropzone.classList.add('is-scanning');
  dom.loadingImg.src = state.image?.previewUrl || '';
  dom.loadingImg.alt = state.image?.name || '';
  dom.elapsed.textContent = '00:00';
  setLoadingStep(0);

  clearInterval(state.loadingTimer);
  clearInterval(state.stepTimer);
  state.loadingTimer = setInterval(() => {
    dom.elapsed.textContent = formatClock(Date.now() - state.startedAt);
  }, 500);
  state.stepTimer = setInterval(() => {
    const next = Math.min(state.step + 1, LOADING_COPY.length - 1);
    if (next !== state.step) setLoadingStep(next);
  }, 4200);

  dom.resultCol.scrollTo({ top: 0, behavior: 'smooth' });
}

function stopLoading() {
  clearInterval(state.loadingTimer);
  clearInterval(state.stepTimer);
  state.loadingTimer = null;
  state.stepTimer = null;
  dom.loadingState.hidden = true;
  dom.dropzone.classList.remove('is-scanning');
}

function setGenerateBusy(busy) {
  state.busy = busy;
  if (state.batchMode) {
    updateBatchPrimary();
    return;
  }
  dom.generateBtn.disabled = busy;
  dom.generateBtn.classList.toggle('is-busy', busy);
  $('.btn-text', dom.generateBtn).textContent = busy ? '正在生成' : '生成标题';
}

function renderDemoBanner(result) {
  const demo = Boolean(result.meta?.demo);
  dom.demoBanner.hidden = !demo;
  if (!demo) return;
  dom.demoText.textContent = result.meta?.demoNote || '当前为演示数据，配置模型后可识别你自己的商品图。';
}

function renderInsight(result) {
  dom.insightCard.replaceChildren();
  const product = result.product || {};
  const thumb = el('div', 'insight-thumb');
  const image = el('img');
  image.src = state.image?.previewUrl || '/favicon.svg';
  image.alt = product.name || '商品图';
  thumb.append(image);

  const main = el('div', 'insight-main');
  const kicker = el('div', 'insight-kicker');
  kicker.append(el('span', 'dot'), el('span', '', 'IMAGE READ'));
  const category = product.category || (product.categoryPath || []).join(' / ');
  if (category) kicker.append(el('span', 'insight-category', category));
  main.append(kicker);
  main.append(el('h3', 'insight-title', product.name || '识别结果'));
  if (product.summary) main.append(el('p', 'insight-summary', product.summary));

  const attrs = (product.attributes || [])
    .map((attribute) => [attribute.name, attribute.value].filter(Boolean).join(' '))
    .filter(Boolean)
    .slice(0, 6);
  if (attrs.length) {
    const attrRow = el('div', 'insight-attrs');
    attrs.forEach((attribute) => attrRow.append(el('span', '', attribute)));
    main.append(attrRow);
  }

  const side = el('div', 'insight-side');
  const ring = el('div', 'score-ring');
  ring.style.setProperty('--value', `${clamp(result.overallScore || 0, 0, 100)}%`);
  const inner = el('div', 'score-ring-inner');
  inner.append(el('strong', '', String(result.overallScore || 0)));
  inner.append(el('small', '', '综合'));
  ring.append(inner);
  side.append(ring, el('span', 'score-label', '标题综合分'));
  if (typeof product.confidence === 'number') {
    side.append(el('span', 'confidence', `识别 ${Math.round(product.confidence * 100)}%`));
  }

  dom.insightCard.append(thumb, main, side);
}

function currentPlatform() {
  return state.platforms.find((platform) => platform.id === state.activePlatform) || null;
}

function renderTabs() {
  if (!state.result) return;
  const platforms = state.platforms.filter((platform) => state.selectedPlatforms.has(platform.id));
  const counts = state.result.platformCounts || {};
  const available = platforms.filter((platform) => (counts[platform.id] || 0) > 0);
  if (!state.activePlatform || !platforms.some((platform) => platform.id === state.activePlatform)) {
    state.activePlatform = (available[0] || platforms[0])?.id || null;
  }

  dom.platformTabs.replaceChildren();
  for (const platform of platforms) {
    const count = counts[platform.id] || 0;
    const active = platform.id === state.activePlatform;
    const tab = el('button', `tab${active ? ' is-active' : ''}`);
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(active));
    tab.append(el('span', '', platform.short), el('em', '', String(count)));
    tab.append(el('small', '', platform.lang === 'en' ? `${platform.maxChars}c` : `${platform.maxChars}字`));
    tab.addEventListener('click', () => {
      state.activePlatform = platform.id;
      renderTabs();
      renderTitles();
      renderKeywords();
      renderCompliance();
    });
    dom.platformTabs.append(tab);
  }
}

function renderTitles() {
  if (!state.result) return;
  const platform = currentPlatform();
  if (!platform) return;
  const titles = (state.result.titles || []).filter((title) => title.platform === platform.id);
  const unit = platform.lang === 'en' ? '字符' : '字';
  const strategyLabels = [...state.selectedStrategies]
    .map((id) => state.strategies.find((strategy) => strategy.id === id)?.label)
    .filter(Boolean)
    .join(' / ');

  dom.listMeta.replaceChildren();
  dom.listMeta.append(el('strong', '', platform.name));
  dom.listMeta.append(el('span', 'sep'));
  dom.listMeta.append(el('span', '', `建议 ≤ ${platform.maxChars} ${unit}${platform.maxBytes ? ` / ${platform.maxBytes} 字节` : ''}`));
  dom.listMeta.append(el('span', 'sep'));
  dom.listMeta.append(el('span', '', strategyLabels || `${titles.length} 条`));

  dom.titleList.replaceChildren();
  if (!titles.length) {
    const note = el('div', 'panel');
    note.append(el('p', 'empty-note', '这个平台没有返回有效标题，可以换一批，或检查模型是否支持中文/英文输出。'));
    dom.titleList.append(note);
    return;
  }

  titles.forEach((title, index) => {
    const card = el('article', `title-card${index === 0 ? ' is-first' : ''}${platform.lang === 'en' ? ' is-en' : ''}`);
    card.style.setProperty('--i', String(index));
    card.title = title.reason || '';

    const top = el('div', 'title-top');
    top.append(el('span', 'strategy-tag', title.strategyLabel || '标题'));
    if (index === 0) {
      const badge = el('span', 'first-badge');
      badge.append(icon('star'), document.createTextNode('首选'));
      top.append(badge);
    }
    if (title.reason) top.append(el('span', 'title-reason', title.reason));
    top.append(el('span', 'title-score', `综合 ${title.score?.overall ?? '—'}`));

    const text = el('p', 'title-text', title.text);

    const foot = el('div', 'title-foot');
    const ratio = title.limit ? title.chars / title.limit : 0;
    const short = title.lengthOk === false;
    const count = el(
      'span',
      `char-count${ratio > 0.9 ? ' is-near' : ''}${short ? ' is-short' : ''}`,
      `${title.chars} / ${title.limit} ${unit}`,
    );
    if (title.bytes) count.title = `约 ${title.bytes} 字节`;
    const meter = el('span', `char-meter${ratio > 0.9 ? ' is-near' : ''}`);
    const fill = el('i');
    fill.style.width = `${clamp(ratio * 100, 2, 100)}%`;
    meter.append(fill);
    foot.append(count, meter);

    if (short) {
      const warning = el('span', 'warning-tag', `低于下限 ${title.minChars} 字`);
      foot.append(warning);
    }
    if (title.missingRequired?.length) {
      const warning = el('span', 'warning-tag', `缺必含词 ${title.missingRequired.length}`);
      warning.title = title.missingRequired.join('、');
      foot.append(warning);
    }
    if (title.warnings?.length) {
      const warning = el('span', 'warning-tag', `含风险词 ${title.warnings.length}`);
      warning.title = title.warnings.join('、');
      foot.append(warning);
    }

    const actions = el('div', 'title-actions');
    const copyButton = el('button', 'icon-action');
    copyButton.type = 'button';
    copyButton.title = '复制标题';
    copyButton.setAttribute('aria-label', '复制标题');
    copyButton.append(icon('copy'));
    copyButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await copyText(title.text);
      copyButton.classList.add('is-copied');
      copyButton.replaceChildren(icon('check'));
      toast('标题已复制', 'success');
      setTimeout(() => {
        copyButton.classList.remove('is-copied');
        copyButton.replaceChildren(icon('copy'));
      }, 1400);
    });
    actions.append(copyButton);

    foot.append(actions);
    card.append(top, text);
    if (title.translation) {
      const label = platform.lang === 'en' ? '中文对照' : 'English';
      card.append(el('p', 'title-translation', `${label}：${title.translation}`));
    }
    card.append(foot);
    dom.titleList.append(card);
  });
}

function renderKeywords() {
  if (!state.result) return;
  const platform = currentPlatform();
  if (!platform) return;
  const isEnglish = platform.lang === 'en';
  let keywords = isEnglish ? state.result.keywordsEn : state.result.keywords;
  let fallbackNote = '';
  if (isEnglish && !(keywords?.core || []).length) {
    keywords = state.result.keywords;
    fallbackNote = '英文关键词缺失，以下为中文参考';
  }

  dom.keywordsPanel.replaceChildren();
  const head = el('div', 'panel-head');
  head.append(el('h3', '', '关键词库'));
  head.append(el('small', '', fallbackNote || `${isEnglish ? 'EN' : '中文'} · 点击复制`));
  dom.keywordsPanel.append(head);

  const groups = [
    ['核心词', keywords?.core],
    ['长尾词', keywords?.long_tail],
    ['风格词', keywords?.emotion],
  ].filter(([, values]) => Array.isArray(values) && values.length);

  if (!groups.length) {
    dom.keywordsPanel.append(el('p', 'empty-note', '模型没有提取到关键词。'));
    return;
  }

  for (const [label, values] of groups) {
    const group = el('div', 'keyword-group');
    group.append(el('div', 'group-label', label));
    const chips = el('div', 'keyword-chips');
    for (const value of values) {
      const chip = el('button', 'keyword-chip', value);
      chip.type = 'button';
      chip.title = `复制「${value}」`;
      chip.addEventListener('click', async () => {
        await copyText(value);
        toast(`已复制「${value}」`, 'success');
      });
      chips.append(chip);
    }
    group.append(chips);
    dom.keywordsPanel.append(group);
  }
}

function renderDescription(result) {
  dom.descriptionPanel.replaceChildren();
  const description = result.description;
  const head = el('div', 'panel-head');
  head.append(el('h3', '', '商品描述'));
  head.append(
    el(
      'small',
      '',
      description?.text
        ? `${description.chars} / ${description.min}–${description.max} 字`
        : '模型未返回',
    ),
  );
  dom.descriptionPanel.append(head);

  if (!description?.text) {
    dom.descriptionPanel.append(el('p', 'empty-note', '这次没有生成商品描述，可以换一批或换一个模型。'));
    return;
  }

  dom.descriptionPanel.append(el('p', 'description-text', description.text));
  const foot = el('div', 'description-foot');
  const count = el(
    'span',
    `description-count${description.ok === false || description.warnings?.length ? ' is-bad' : ''}`,
    [
      description.ok === false
        ? `低于/超出设定范围：${description.chars} 字（${description.min}–${description.max}）`
        : `已落在 ${description.min}–${description.max} 字范围内`,
      description.warnings?.length ? `含风险词：${description.warnings.join('、')}` : '',
    ].filter(Boolean).join(' · '),
  );
  const copy = el('button', 'description-copy');
  copy.type = 'button';
  copy.append(icon('copy'), document.createTextNode('复制描述'));
  copy.addEventListener('click', async () => {
    await copyText(description.text);
    toast('描述已复制', 'success');
  });
  foot.append(count, copy);
  dom.descriptionPanel.append(foot);
}

function renderCompliance() {
  if (!state.result) return;
  const platform = currentPlatform();
  const compliance = state.result.compliance || {};
  const quality = state.result.imageQuality || {};
  dom.compliancePanel.replaceChildren();

  const head = el('div', 'panel-head');
  head.append(el('h3', '', '合规与画质'));
  head.append(el('small', '', platform?.short || ''));
  dom.compliancePanel.append(head);

  const forbidden = (compliance.forbidden || []).filter((item) => item?.term);
  if (forbidden.length) {
    const riskRow = el('div', 'risk-row');
    forbidden.slice(0, 8).forEach((item) => {
      const tag = el('span', 'risk-tag', item.term);
      tag.title = item.label || '需谨慎使用';
      riskRow.append(tag);
    });
    dom.compliancePanel.append(riskRow);
  }

  const list = el('ul', 'compliance-list');
  const notes = [...(compliance.notes || [])];
  if (!notes.length && !forbidden.length) {
    notes.push('未发现常见极限词；成分、认证与功效仍需与实物一致。');
  }
  if (platform?.hint) notes.push(`平台提醒：${platform.hint}。`);
  notes.slice(0, 4).forEach((note) => {
    const item = el('li');
    item.append(el('span', 'dot'), el('span', '', note));
    list.append(item);
  });
  if (forbidden.length) {
    const item = el('li', 'is-risk');
    item.append(el('span', 'dot'), el('span', '', '风险词不一定违法，但需要授权材料或事实依据；上架前建议替换。'));
    list.append(item);
  }
  dom.compliancePanel.append(list);

  if (typeof quality.score === 'number') {
    const row = el('div', 'quality-row');
    row.append(el('span', '', `画面 ${quality.score}`));
    const bar = el('span', 'quality-bar');
    const fill = el('i');
    fill.style.width = `${clamp(quality.score, 2, 100)}%`;
    bar.append(fill);
    row.append(bar);
    row.append(el('span', '', quality.score >= 85 ? '可用' : '建议重拍'));
    dom.compliancePanel.append(row);
  }

  for (const issue of (quality.issues || []).slice(0, 3)) {
    const item = el('p', 'empty-note', `拍摄建议：${issue}`);
    item.style.marginTop = '6px';
    dom.compliancePanel.append(item);
  }
}

function showResult(result, clientElapsed) {
  if (!result?.titles?.length) {
    showError('没有拿到可用标题', '模型返回了空结果。可以换一批，或换一个视觉模型。');
    return;
  }
  state.result = result;
  const counts = result.platformCounts || {};
  const first = state.platforms.find(
    (platform) => state.selectedPlatforms.has(platform.id) && (counts[platform.id] || 0) > 0,
  );
  state.activePlatform = first?.id || state.platforms[0]?.id || null;

  dom.emptyState.hidden = true;
  dom.errorState.hidden = true;
  dom.resultContent.hidden = false;
  dom.resultTools.hidden = false;
  dom.resultHeading.textContent = result.product?.name || '生成完成';
  const elapsed = result.meta?.elapsedMs || clientElapsed || 0;
  const modelLabel = result.meta?.demo ? '内置示例' : result.meta?.model || '视觉模型';
  dom.resultSub.textContent = result.meta?.demo
    ? `${result.titleCount} 条标题 · 内置示例（非真实识别）`
    : `${result.titleCount} 条标题 · ${(elapsed / 1000).toFixed(1)}s · ${modelLabel}`;
  dom.crumbCurrent.textContent =
    (result.product?.name || '生成结果').length > 18
      ? `${result.product.name.slice(0, 18)}…`
      : result.product?.name || '生成结果';
  dom.resultModel.textContent = `${modelLabel} · ${formatDate(result.meta?.generatedAt || Date.now())}`;
  dom.resultFootNote.textContent = result.meta?.demo
    ? '示例标题由人工撰写，仅用于体验流程；上架前请核对实物信息与平台规则。'
    : '标题由 AI 生成，上架前请核对实物信息与平台规则。';

  renderDemoBanner(result);
  renderInsight(result);
  renderTabs();
  renderTitles();
  renderDescription(result);
  renderKeywords();
  renderCompliance();
  dom.resultCol.scrollTo({ top: 0, behavior: 'smooth' });
  addHistory(result);
  toast(`已生成 ${result.titleCount} 条标题`, 'success');
}

function showError(title, message, detail = '') {
  stopLoading();
  dom.emptyState.hidden = true;
  dom.loadingState.hidden = true;
  dom.resultContent.hidden = true;
  dom.errorState.hidden = false;
  dom.resultTools.hidden = true;
  dom.resultHeading.textContent = '生成没有完成';
  dom.resultSub.textContent = '检查模型设置，或稍后再试。';
  dom.crumbCurrent.textContent = '生成失败';
  dom.errorTitle.textContent = title;
  dom.errorMessage.textContent = message;
  dom.errorDetail.textContent = detail || '';
  dom.errorDetailWrap.hidden = !detail;
  dom.errorDetailWrap.open = Boolean(detail);
  if (detail) {
    dom.resultSub.textContent = '模型服务返回了具体错误，下方技术细节里有原始错误信息。';
  }
}

/* ------------------------------------------------------------------ */
/*  batch                                                             */
/* ------------------------------------------------------------------ */

function batchCounts() {
  const items = state.batch.items;
  return {
    total: items.length,
    done: items.filter((item) => item.status === 'done').length,
    failed: items.filter((item) => item.status === 'error').length,
    processing: items.filter((item) => item.status === 'processing').length,
    pending: items.filter((item) => item.status === 'queued').length,
  };
}

function batchStatusLabel(status) {
  return {
    queued: '待处理',
    processing: '识别中',
    done: '已完成',
    error: '失败',
  }[status] || '未知';
}

function updateBatchMini() {
  if (!dom.batchMini) return;
  const counts = batchCounts();
  dom.batchMini.replaceChildren();
  const text = el('span', '', `${counts.total} 张 · 完成 ${counts.done}${counts.failed ? ` · 失败 ${counts.failed}` : ''}`);
  const allFinished = counts.total > 0 && counts.done + counts.failed === counts.total;
  const small = el(
    'small',
    '',
    state.batch.running
      ? '正在逐张处理…'
      : allFinished
        ? '已全部完成'
        : counts.total
          ? '等待开始'
          : '支持整文件夹，不限张数。',
  );
  const track = el('span', 'mini-track');
  const fill = el('i');
  fill.style.width = `${counts.total ? Math.round(((counts.done + counts.failed) / counts.total) * 100) : 0}%`;
  track.append(fill);
  dom.batchMini.append(text, small, track);
}

function filteredBatchItems() {
  const query = String(state.batch.filter || '').trim().toLowerCase();
  if (!query) return state.batch.items;
  return state.batch.items.filter((item) =>
    [item.sku, item.name, item.result?.product?.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query),
  );
}

function selectedTitleIndexes(item) {
  if (item.selectedTitleIndexes instanceof Set) return item.selectedTitleIndexes;
  return new Set((item.result?.titles || []).map((_, index) => index));
}

function selectedTitleCount() {
  return state.batch.items.reduce(
    (sum, item) => sum + (item.status === 'done' ? selectedTitleIndexes(item).size : 0),
    0,
  );
}

function updateBatchFilterUi() {
  if (!dom.batchFilterCount) return;
  const filtered = filteredBatchItems();
  const selected = selectedTitleCount();
  dom.batchFilterCount.textContent = state.batch.filter
    ? `筛选 ${filtered.length}/${state.batch.items.length} · 已选 ${selected} 条`
    : `已选 ${selected} 条`;
  dom.batchFilterClear.hidden = !state.batch.filter;
}

function renderBatch() {
  updateBatchMini();
  if (!state.batchMode) {
    updateBatchPrimary();
    return;
  }
  const counts = batchCounts();
  dom.emptyState.hidden = true;
  dom.loadingState.hidden = true;
  dom.errorState.hidden = true;
  dom.resultContent.hidden = true;
  dom.batchView.hidden = false;
  dom.resultTools.hidden = true;
  dom.resultHeading.textContent = '批量处理';
  dom.resultSub.textContent = counts.total
    ? `${counts.total} 张图片 · 完成 ${counts.done}${counts.failed ? ` · 失败 ${counts.failed}` : ''}`
    : '整文件夹导入，逐张实时出关键词与标题。';
  dom.crumbCurrent.textContent = '批量任务';
  dom.generateMeta.textContent = counts.total ? `${counts.done} / ${counts.total} 已完成` : '先导入图片';

  dom.batchSummaryText.textContent = !counts.total
    ? '导入文件夹，队列会逐张识别并匹配标题。'
    : counts.processing
      ? `正在处理 ${counts.processing} 张 · 已完成 ${counts.done} / ${counts.total}`
      : counts.done + counts.failed === counts.total
        ? `处理完成 · 成功 ${counts.done}${counts.failed ? ` · 失败 ${counts.failed}` : ''}`
        : `待处理 ${counts.pending} 张 · 已完成 ${counts.done} / ${counts.total}`;

  const finished = counts.done + counts.failed;
  dom.batchProgressBar.style.width = `${counts.total ? Math.round((finished / counts.total) * 100) : 0}%`;

  dom.batchStats.replaceChildren();
  const stats = [
    ['图片', counts.total],
    ['完成', counts.done],
    ['识别中', counts.processing],
    ['失败', counts.failed],
  ];
  for (const [label, value] of stats) {
    const card = el('div', 'batch-stat');
    card.append(el('strong', '', String(value)), el('span', '', label));
    dom.batchStats.append(card);
  }

  if (!dom.batchFileName.value) {
    dom.batchFileName.value = defaultBatchName();
  }

  const allDone = counts.total > 0 && counts.done === counts.total;
  const preprocessing = Boolean(state.batch.preprocess?.running);
  dom.batchStartBtn.disabled =
    state.batch.running || preprocessing || counts.total === 0 || allDone;
  dom.batchStartBtn.textContent = preprocessing
    ? '预处理中…'
    : state.batch.running
      ? '识别中…'
      : allDone
        ? '已完成'
        : counts.failed > 0
          ? '重试失败'
          : '开始处理';
  const queued = counts.pending || 0;
  dom.batchPreprocessBtn.disabled =
    state.batch.running || preprocessing || queued === 0;
  dom.batchPreprocessBtn.textContent = preprocessing ? '预处理中…' : '预处理';
  dom.batchStopBtn.hidden = !(state.batch.running || preprocessing);
  dom.batchStopBtn.disabled = !(state.batch.running || preprocessing) || state.batch.cancel;
  dom.batchStopBtn.textContent = state.batch.cancel ? '正在停止…' : '停止';
  const selectedTitles = selectedTitleCount();
  dom.batchPreviewBtn.disabled = selectedTitles === 0;
  dom.batchExcelBtn.disabled = selectedTitles === 0;
  dom.batchCsvBtn.disabled = selectedTitles === 0;
  dom.batchFolderBtn.disabled = selectedTitles === 0;
  dom.batchEmpty.hidden = counts.total > 0;
  dom.batchLive.hidden = counts.total === 0;
  dom.batchList.hidden = counts.total === 0;

  const preStats = batchPreprocessStats();
  if (preStats.total) {
    const pre = state.batch.preprocess || {};
    dom.batchPreprocessStatus.hidden = false;
    if (pre.running) {
      dom.batchPreprocessStatus.textContent =
        `① 正在预处理 ${pre.done || 0}/${pre.total || preStats.total} · ` +
        `${formatBytes(preStats.original)} → ${formatBytes(preStats.processed)}`;
    } else if (state.batch.running) {
      dom.batchPreprocessStatus.textContent =
        `② 正在识别 ${counts.done}/${counts.total} · ` +
        `① 已预处理 ${preStats.done}/${preStats.total} · ` +
        `${formatBytes(preStats.original)} → ${formatBytes(preStats.processed)}`;
    } else if (preStats.done) {
      const saved = preStats.original > 0
        ? Math.max(0, Math.round((1 - preStats.processed / preStats.original) * 100))
        : 0;
      dom.batchPreprocessStatus.textContent =
        `已预处理 ${preStats.done}/${preStats.total} 张 · ` +
        `${formatBytes(preStats.original)} → ${formatBytes(preStats.processed)}` +
        (preStats.original ? `（节省 ${saved}%）` : '');
    } else {
      dom.batchPreprocessStatus.textContent =
        `启动时会先按${state.rules.imageResizeMode === 'width' ? '宽度' : '最长边'} ` +
        `压缩到 ${state.rules.imageMaxEdge}px，再逐张识别`;
    }
  } else {
    dom.batchPreprocessStatus.hidden = true;
  }

  renderBatchLive();
  renderBatchList();
  updateBatchFilterUi();
  updateBatchPrimary();
}

function renderBatchLive() {
  dom.batchLive.replaceChildren();
  if (!state.batch.items.length) return;
  const latest =
    state.batch.items.find((item) => item.id === state.batch.latestId && item.status === 'done') ||
    [...state.batch.items].reverse().find((item) => item.status === 'done') ||
    state.batch.items.find((item) => item.status === 'processing') ||
    [...state.batch.items].reverse().find((item) => item.status === 'error');
  if (!latest) return;

  const card = el('article', 'batch-live-card');
  const thumb = el('div', 'batch-live-thumb');
  const img = el('img');
  img.src = latest.previewUrl || '/favicon.svg';
  img.alt = latest.name;
  thumb.append(img);

  const main = el('div', 'batch-live-main');
  const kicker = el('div', 'batch-live-kicker');
  kicker.append(el('i'), el('span', '', latest.status === 'done' ? 'LATEST RESULT' : latest.status === 'processing' ? 'READING IMAGE' : 'LAST ERROR'));
  main.append(kicker);
  main.append(el('h3', 'batch-live-title', `SKU ${latest.sku || latest.name}`));
  if (latest.result?.product?.name) {
    main.append(el('p', 'batch-live-product', latest.result.product.name));
  }
  const keywordRow = el('div', 'batch-live-keywords');
  const keywords = latest.result
    ? [...(latest.result.keywords?.core || []), ...(latest.result.keywords?.long_tail || [])].slice(0, 8)
    : [];
  if (keywords.length) {
    keywords.forEach((keyword) => keywordRow.append(el('span', '', keyword)));
  } else if (latest.status === 'processing') {
    keywordRow.append(el('span', '', '识别完成后，这里会出现关键词'));
  } else if (latest.status === 'error') {
    keywordRow.append(el('span', '', latest.error || '处理失败'));
  }
  main.append(keywordRow);

  const titleList = el('div', 'batch-live-titles');
  if (latest.result) {
    const perPlatform = [];
    const seenPlatforms = new Set();
    for (const title of latest.result.titles || []) {
      if (seenPlatforms.has(title.platform)) continue;
      seenPlatforms.add(title.platform);
      perPlatform.push(title);
      if (perPlatform.length >= 3) break;
    }
    for (const title of perPlatform) {
      const line = el('div');
      line.append(el('strong', '', `${platformShort(title.platform)} · ${title.chars}/${title.limit}`));
      line.append(el('span', '', ` ${title.text}`));
      if (title.translation) {
        line.append(el('small', 'batch-live-translation', title.translation));
      }
      titleList.append(line);
    }
  } else if (latest.status === 'processing') {
    titleList.append(el('div', '', '正在提取卖点并按平台压缩字数…'));
  }
  main.append(titleList);
  card.append(thumb, main);
  dom.batchLive.append(card);
}

function platformShort(id) {
  return state.platforms.find((platform) => platform.id === id)?.short || id;
}

function renderBatchList() {
  dom.batchList.replaceChildren();
  if (!state.batch.items.length) return;
  const items = filteredBatchItems();
  if (!items.length) {
    const empty = el('div', 'batch-filter-empty');
    empty.append(
      el('strong', '', '没有匹配的图片'),
      el('span', '', `筛选词：${state.batch.filter}`),
    );
    dom.batchList.append(empty);
    return;
  }
  items.forEach((item, index) => {
    const originalIndex = state.batch.items.indexOf(item);
    const card = el('article', 'batch-card');
    if (state.batch.expanded.has(item.id)) card.classList.add('is-open');
    card.dataset.id = item.id;

    const header = el('div', 'batch-card-header');
    const thumb = el('div', 'batch-thumb');
    const img = el('img');
    img.src = item.previewUrl || '/favicon.svg';
    img.alt = item.name;
    img.loading = 'lazy';
    thumb.append(img);

    const main = el('div', 'batch-card-main');
    const fileLine = el('div', 'batch-file');
    fileLine.append(el('span', `batch-status status-${item.status}`, batchStatusLabel(item.status)));
    const skuLabel = el('span', 'batch-sku', `SKU ${item.sku || item.name}`);
    skuLabel.title = item.name;
    fileLine.append(skuLabel);
    if (item.file) {
      const preprocessLabel =
        item.preprocessState === 'done'
          ? ` · 已压缩 ${item.processedWidth}×${item.processedHeight} · ${formatBytes(item.processedSize)}`
          : item.preprocessState === 'processing'
            ? ' · 压缩中…'
            : item.preprocessState === 'error'
              ? ' · 压缩失败'
              : ' · 待压缩';
      fileLine.append(el('span', 'batch-file-preprocess', preprocessLabel));
    }
    main.append(fileLine);
    main.append(el('div', 'batch-product', item.result?.product?.name || (item.status === 'processing' ? '正在识别…' : item.status === 'error' ? '处理失败' : '等待处理')));
    const keywordRow = el('div', 'batch-keywords');
    for (const keyword of (item.result?.keywords?.core || []).slice(0, 6)) {
      keywordRow.append(el('span', '', keyword));
    }
    if (item.result?.description?.text && !keywordRow.children.length) {
      keywordRow.append(el('span', '', item.result.description.text.slice(0, 18)));
    }
    main.append(keywordRow);

    const best = el('div', 'batch-best');
    const firstTitle = item.result?.titles?.[0];
    best.append(el('div', 'batch-best-title', firstTitle?.text || (item.status === 'error' ? item.error : '—')));
    const selectedCount = selectedTitleIndexes(item).size;
    best.append(
      el(
        'div',
        'batch-best-meta',
        firstTitle
          ? `${platformShort(firstTitle.platform)} · ${firstTitle.chars}/${firstTitle.limit} 字 · ${item.result.titles.length} 条 · 已选 ${selectedCount}/${item.result.titles.length}`
          : '',
      ),
    );
    header.append(thumb, main, best, icon('chevron', 'ico batch-chevron'));
    header.addEventListener('click', () => {
      if (state.batch.expanded.has(item.id)) state.batch.expanded.delete(item.id);
      else state.batch.expanded.add(item.id);
      renderBatchList();
    });

    const detail = el('div', 'batch-detail');
    if (item.result) {
      for (const [titleIndex, title] of item.result.titles.entries()) {
        const row = el('div', 'batch-detail-row');
        const check = el('label', 'batch-title-check');
        const checkbox = el('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedTitleIndexes(item).has(titleIndex);
        checkbox.title = '勾选后才会导出这条标题';
        checkbox.addEventListener('change', (event) => {
          event.stopPropagation();
          const selected = selectedTitleIndexes(item);
          if (checkbox.checked) selected.add(titleIndex);
          else selected.delete(titleIndex);
          item.selectedTitleIndexes = selected;
          renderBatchList();
          updateBatchFilterUi();
          updateBatchPrimary();
        });
        check.append(checkbox);
        row.append(check);
        row.append(el('div', 'batch-detail-platform', platformShort(title.platform)));
        const titleBox = el('div', 'batch-detail-title-box');
        titleBox.append(el('div', 'batch-detail-title', title.text));
        if (title.translation) {
          titleBox.append(el('div', 'batch-detail-translation', title.translation));
        }
        row.append(titleBox);
        const copy = el('button', 'batch-detail-copy');
        copy.type = 'button';
        copy.title = '复制这条标题';
        copy.append(icon('copy'));
        copy.addEventListener('click', async (event) => {
          event.stopPropagation();
          await copyText(title.text);
          toast('标题已复制', 'success');
        });
        row.append(copy);
        detail.append(row);
      }
      if (item.result.description?.text) {
        detail.append(el('div', 'batch-detail-desc', `描述（${item.result.description.chars} 字）：${item.result.description.text}`));
      }
      const actions = el('div', 'batch-detail-actions');
      const copyAll = el('button', '', '复制全部标题');
      copyAll.type = 'button';
      copyAll.addEventListener('click', async (event) => {
        event.stopPropagation();
        await copyText(item.result.titles.map((title) => `${platformShort(title.platform)}：${title.text}`).join('\n'));
        toast('全部标题已复制', 'success');
      });
      const selectAll = el('button', '', '全选标题');
      selectAll.type = 'button';
      selectAll.addEventListener('click', (event) => {
        event.stopPropagation();
        item.selectedTitleIndexes = new Set(item.result.titles.map((_, index) => index));
        renderBatchList();
        updateBatchFilterUi();
        updateBatchPrimary();
      });
      const selectNone = el('button', '', '全不选');
      selectNone.type = 'button';
      selectNone.addEventListener('click', (event) => {
        event.stopPropagation();
        item.selectedTitleIndexes = new Set();
        renderBatchList();
        updateBatchFilterUi();
        updateBatchPrimary();
      });
      const remove = el('button', '', '移除');
      remove.type = 'button';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        removeBatchItem(item.id);
      });
      actions.append(selectAll, selectNone, copyAll, remove);
      detail.append(actions);
    } else if (item.status === 'error') {
      detail.append(el('div', 'batch-detail-error', item.error || '处理失败，请重试。'));
      const actions = el('div', 'batch-detail-actions');
      const retry = el('button', '', '重试');
      retry.type = 'button';
      retry.addEventListener('click', (event) => {
        event.stopPropagation();
        item.status = 'queued';
        item.error = '';
        startBatch();
      });
      const remove = el('button', '', '移除');
      remove.type = 'button';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        removeBatchItem(item.id);
      });
      actions.append(retry, remove);
      detail.append(actions);
    } else if (item.status === 'processing') {
      detail.append(el('div', 'batch-detail-desc', '正在识别这张图，完成后会自动更新关键词与标题。'));
    }
    card.append(header, detail);
    dom.batchList.append(card);
  });
}

function removeBatchItem(id) {
  if (state.batch.running) {
    toast('批量处理中，停止后再移除');
    return;
  }
  const item = state.batch.items.find((entry) => entry.id === id);
  if (!item) return;
  if (String(item.previewUrl).startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
  state.batch.items = state.batch.items.filter((entry) => entry.id !== id);
  state.batch.expanded.delete(id);
  if (state.batch.latestId === id) state.batch.latestId = null;
  renderBatch();
}

function clearBatch() {
  if (state.batch.running || state.batch.preprocess?.running) {
    toast('先停止批量处理，再清空队列');
    return;
  }
  for (const item of state.batch.items) {
    if (String(item.previewUrl).startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
  }
  state.batch.items = [];
  state.batch.latestId = null;
  state.batch.expanded.clear();
  state.batch.startedAt = 0;
  state.batch.phase = 'idle';
  state.batch.preprocess = { running: false, total: 0, done: 0 };
  renderBatch();
}

function batchPreprocessStats() {
  const items = state.batch.items.filter((item) => item.file);
  const done = items.filter((item) => item.preprocessState === 'done');
  const original = done.reduce((sum, item) => sum + (item.originalSize || 0), 0);
  const processed = done.reduce((sum, item) => sum + (item.processedSize || 0), 0);
  return { total: items.length, done: done.length, original, processed };
}

async function preprocessBatchItem(item) {
  if (!item.file) {
    item.preprocessState = 'done';
    return;
  }
  if (item.preprocessState === 'done' && item.dataUrl) return;
  item.preprocessState = 'processing';
  renderBatch();
  try {
    const processed = await processImageFile(
      item.file,
      state.rules.imageMaxEdge,
      state.rules.imageResizeMode,
    );
    item.dataUrl = processed.dataUrl;
    item.width = processed.width;
    item.height = processed.height;
    item.processedWidth = processed.targetWidth;
    item.processedHeight = processed.targetHeight;
    item.processedSize = processed.processedSize;
    item.preprocessState = 'done';
    item.preprocessError = '';
  } catch (error) {
    item.preprocessState = 'error';
    item.preprocessError = error.message || '压缩失败';
    item.status = 'error';
    item.error = item.preprocessError;
  } finally {
    renderBatch();
  }
}

async function preprocessBatchItems(items) {
  const pending = items.filter(
    (item) => item.file && item.preprocessState !== 'done' && item.status !== 'done',
  );
  state.batch.preprocess = { running: true, total: pending.length, done: 0 };
  state.batch.cancel = false;
  renderBatch();
  for (const item of pending) {
    if (state.batch.cancel) break;
    await preprocessBatchItem(item);
    state.batch.preprocess.done += 1;
    renderBatch();
  }
  state.batch.preprocess.running = false;
  renderBatch();
  return batchPreprocessStats();
}

async function preprocessBatchOnly() {
  if (state.batch.running || state.batch.preprocess.running || state.busy) {
    toast('正在处理，稍等一下');
    return;
  }
  const items = state.batch.items.filter((item) => item.file && item.status !== 'done');
  if (!items.length) {
    toast('没有需要预处理的真实图片');
    return;
  }
  state.batch.phase = 'preprocess';
  dom.batchPreprocessBtn.disabled = true;
  dom.batchPreprocessBtn.textContent = '预处理中…';
  try {
    await preprocessBatchItems(items);
    const stats = batchPreprocessStats();
    toast(
      state.batch.cancel
        ? '已停止预处理'
        : `预处理完成：${stats.done} 张，${formatBytes(stats.original)} → ${formatBytes(stats.processed)}`,
      state.batch.cancel ? 'error' : 'success',
    );
  } finally {
    state.batch.cancel = false;
    state.batch.phase = 'idle';
    dom.batchPreprocessBtn.disabled = false;
    dom.batchPreprocessBtn.textContent = '预处理';
    renderBatch();
  }
}

async function processBatchItem(item) {
  item.status = 'processing';
  item.error = '';
  item.startedAt = Date.now();
  renderBatch();
  try {
    const platforms = [...state.selectedPlatforms];
    const strategies = [...state.selectedStrategies];
    let result;
    if (state.settings.provider === 'demo' && item.sampleId) {
      const data = await postJson(
        '/api/demo',
        { sampleId: item.sampleId, platforms, strategies, rules: state.rules },
        30_000,
      );
      result = data.result;
    } else {
      if (!isModelReady()) throw new Error('视觉模型还没有配置好');
      let imageData = item.dataUrl;
      if (!imageData) {
        if (item.sampleId) {
          imageData = await sampleImageData(item.sampleId);
        } else {
          const processed = await processImageFile(
            item.file,
            state.rules.imageMaxEdge,
            state.rules.imageResizeMode,
          );
          imageData = processed.dataUrl;
          item.width = processed.width;
          item.height = processed.height;
          item.dataUrl = imageData;
        }
      }
      const data = await postJson(
        '/api/analyze',
        {
          image: imageData,
          brief: collectBrief(),
          platforms,
          strategies,
          rules: state.rules,
          settings: requestSettings(),
        },
        240_000,
      );
      result = data.result;
    }
    item.result = result;
    item.selectedTitleIndexes = new Set(result.titles.map((_, index) => index));
    item.status = 'done';
    item.finishedAt = Date.now();
    state.batch.latestId = item.id;
  } catch (error) {
    item.status = 'error';
    item.error = error?.message || '处理失败';
    item.finishedAt = Date.now();
  }
  renderBatch();
}

async function startBatch() {
  if (state.batch.running) return;
  if (state.busy) {
    toast('单张正在生成，稍后再开始批量');
    return;
  }
  if (!state.batch.items.length) {
    toast('先导入图片或载入示例批次');
    return;
  }
  if (!state.selectedPlatforms.size) {
    toast('至少选择一个发布平台');
    return;
  }
  if (!state.selectedStrategies.size) {
    toast('至少选择一个标题策略');
    return;
  }
  if (state.settings.provider === 'demo') {
    const realImages = state.batch.items.filter((item) => !item.sampleId && item.status !== 'done');
    if (realImages.length) {
      toast('演示模式只能处理示例批次；识别自己的图请先配置模型');
      openSettings('批量处理真实图片需要视觉模型。当前是演示模式，只支持示例图。');
      return;
    }
  } else if (!isModelReady()) {
    toast('视觉模型还没有配置好');
    openSettings();
    return;
  }
  for (const item of state.batch.items) {
    if (item.status === 'error') {
      item.status = 'queued';
      item.error = '';
    }
  }
  let queue = state.batch.items.filter((item) => item.status === 'queued');
  if (!queue.length) {
    toast('队列里没有待处理的图片');
    return;
  }

  state.batch.cancel = false;
  const needPreprocess = queue.filter(
    (item) => item.file && item.preprocessState !== 'done',
  );
  if (needPreprocess.length) {
    state.batch.phase = 'preprocess';
    toast(`① 先压缩预处理 ${needPreprocess.length} 张图片…`);
    await preprocessBatchItems(needPreprocess);
    if (state.batch.cancel) {
      state.batch.cancel = false;
      state.batch.running = false;
      state.batch.phase = 'idle';
      renderBatch();
      toast('已停止预处理');
      return;
    }
    queue = queue.filter((item) => item.status === 'queued');
    if (!queue.length) {
      state.batch.phase = 'idle';
      renderBatch();
      toast('预处理失败，没有可继续识别的图片', 'error');
      return;
    }
    toast(`① 预处理完成，② 开始识别 ${queue.length} 张图片`);
  } else {
    toast(`② 开始识别 ${queue.length} 张图片`);
  }

  state.batch.phase = 'analyze';
  state.batch.running = true;
  state.batch.cancel = false;
  state.batch.startedAt = Date.now();
  renderBatch();

  let cursor = 0;
  const concurrency = state.rules.concurrencyMode === 'auto'
    ? recommendedConcurrency()
    : clamp(Number(state.rules.concurrency) || 1, 1, 20);
  const worker = async () => {
    while (!state.batch.cancel && cursor < queue.length) {
      const item = queue[cursor];
      cursor += 1;
      if (!item || item.status !== 'queued') continue;
      await processBatchItem(item);
    }
  };
  try {
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  } finally {
    state.batch.running = false;
    state.batch.phase = 'idle';
    renderBatch();
    const counts = batchCounts();
    toast(
      state.batch.cancel
        ? `已停止：完成 ${counts.done} 张，失败 ${counts.failed} 张`
        : `批量完成：${counts.done} 张成功${counts.failed ? `，${counts.failed} 张失败` : ''}`,
      counts.failed ? 'error' : 'success',
    );
    state.batch.cancel = false;
  }
}

function stopBatch() {
  if (!(state.batch.running || state.batch.preprocess?.running)) return;
  state.batch.cancel = true;
  dom.batchStopBtn.disabled = true;
  dom.batchStopBtn.textContent = '正在停止…';
  toast(
    state.batch.preprocess?.running && !state.batch.running
      ? '正在停止预处理…'
      : '已停止接收新图片，正在收尾当前张…',
  );
}

function defaultBatchName() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `跨多多标题工坊-批量-${stamp}`;
}

function sanitizeFileName(value, fallback = 'title-studio') {
  const name = String(value || '')
    .replace(/[<>:"/\\|?*#%\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return name || fallback;
}

function batchBaseName() {
  return sanitizeFileName(dom.batchFileName.value || defaultBatchName(), defaultBatchName())
    .replace(/\.(xlsx|xls|csv)$/i, '');
}

function selectedExportItems() {
  return state.batch.items
    .filter((item) => item.status === 'done' && item.result)
    .map((item) => {
      const indexes = selectedTitleIndexes(item);
      const titles = (item.result.titles || []).filter((_, index) => indexes.has(index));
      return {
        ...item,
        result: { ...item.result, titles },
      };
    })
    .filter((item) => item.result.titles.length > 0);
}

function batchImageFileName(item, index) {
  const prefix = String(index + 1).padStart(3, '0');
  const ext = item.file
    ? (item.file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg').toLowerCase()
    : '.svg';
  const baseName = sanitizeFileName(item.name, `image-${index + 1}`).replace(/\.[a-z0-9]+$/i, '');
  return `${prefix}-${baseName}${ext}`;
}

function openBatchPreview() {
  const items = state.batch.items.filter(
    (item) => item.status === 'done' && item.result,
  );
  if (!items.length) {
    toast('还没有可预览的批量结果');
    return;
  }
  const base = batchBaseName();
  const imagePaths = new Map();
  const tree = [];
  tree.push({ name: `${base}/`, type: 'root' });
  tree.push({ name: `${base}.xlsx`, type: 'xlsx' });
  if (state.rules.saveOriginalImages !== false) {
    tree.push({ name: 'images/', type: 'folder' });
    items.forEach((item, index) => {
      const fileName = batchImageFileName(item, index);
      const previewUrl = item.file
        ? item.previewUrl
        : new URL(item.previewUrl, location.href).href;
      imagePaths.set(item.id, previewUrl);
      tree.push({ name: `  ${fileName}`, type: 'file' });
    });
  }
  tree.push({ name: `${base}-预览.html`, type: 'html' });
  tree.push({ name: `${base}-数据.json`, type: 'file' });

  dom.batchPreviewTree.replaceChildren();
  for (const entry of tree) {
    const node = el('div', `preview-tree-${entry.type}`, entry.name);
    if (entry.type === 'file') node.classList.add('preview-tree-file');
    if (entry.type === 'xlsx') node.classList.add('preview-tree-file', 'is-xlsx');
    if (entry.type === 'html') node.classList.add('preview-tree-file', 'is-html');
    dom.batchPreviewTree.append(node);
  }
  const totalTitles = items.reduce(
    (sum, item) => sum + (item.result?.titles?.length || 0),
    0,
  );
  dom.batchPreviewTree.append(
    el(
      'p',
      'preview-tree-count',
      `${items.length} 张图 · 已选 ${selectedTitleCount()}/${totalTitles} 条标题` +
        (state.rules.saveOriginalImages === false ? ' · 不保存原图' : ' · 保存原图'),
    ),
  );

  dom.batchPreviewSummary.textContent =
    `${items.length} 张图片 · 已选 ${selectedTitleCount()}/${totalTitles} 条标题 · 预览不会写入磁盘`;
  dom.batchPreviewExcelBtn.disabled = selectedTitleCount() === 0;
  dom.batchPreviewSaveBtn.disabled = selectedTitleCount() === 0;
  dom.batchPreviewFrame.srcdoc = buildBatchReportHtml(imagePaths, { selectable: true });
  dom.batchPreviewModal.hidden = false;
  document.body.classList.add('preview-open');
}

function syncBatchPreviewSelectionUi() {
  const items = state.batch.items.filter(
    (item) => item.status === 'done' && item.result,
  );
  const totalTitles = items.reduce(
    (sum, item) => sum + (item.result?.titles?.length || 0),
    0,
  );
  const selected = selectedTitleCount();
  dom.batchPreviewSummary.textContent =
    `${items.length} 张图片 · 已选 ${selected}/${totalTitles} 条标题 · 预览不会写入磁盘`;
  const treeCount = dom.batchPreviewTree.querySelector('.preview-tree-count');
  if (treeCount) {
    treeCount.textContent =
      `${items.length} 张图 · 已选 ${selected}/${totalTitles} 条标题` +
      (state.rules.saveOriginalImages === false ? ' · 不保存原图' : ' · 保存原图');
  }
  const meta = dom.batchPreviewFrame.contentDocument?.getElementById('preview-selected-meta');
  if (meta) meta.textContent = `已选 ${selected} / ${totalTitles} 条`;
  dom.batchPreviewExcelBtn.disabled = selected === 0;
  dom.batchPreviewSaveBtn.disabled = selected === 0;
  dom.batchPreviewBtn.disabled = selected === 0;
  dom.batchExcelBtn.disabled = selected === 0;
  dom.batchCsvBtn.disabled = selected === 0;
  dom.batchFolderBtn.disabled = selected === 0;
  updateBatchFilterUi();
  updateBatchPrimary();
}

function bindBatchPreviewSelection() {
  const doc = dom.batchPreviewFrame.contentDocument;
  if (!doc) return;
  try {
    dom.batchPreviewFrame.contentWindow?.scrollTo(0, 0);
  } catch {
    // ignore
  }
  doc.querySelectorAll('input[data-preview-title]').forEach((input) => {
    input.addEventListener('change', () => {
      const card = input.closest('[data-item-id]');
      const item = state.batch.items.find(
        (candidate) => candidate.id === card?.dataset.itemId,
      );
      if (!item) return;
      const index = Number(input.dataset.titleIndex);
      const selected = selectedTitleIndexes(item);
      if (input.checked) selected.add(index);
      else selected.delete(index);
      item.selectedTitleIndexes = selected;
      input.closest('.title-row')?.classList.toggle('is-unselected', !input.checked);
      syncBatchPreviewSelectionUi();
    });
  });
}

function closeBatchPreview() {
  dom.batchPreviewModal.hidden = true;
  document.body.classList.remove('preview-open');
  dom.batchPreviewFrame.srcdoc = '';
}

function batchExportPayload() {
  const base = batchBaseName();
  return {
    title: base,
    platforms: [...state.selectedPlatforms],
    rules: state.rules,
    model: state.settings.provider === 'demo' ? '内置示例' : state.settings.model,
    items: selectedExportItems().map((item) => ({
      name: item.name,
      sku: item.sku || '',
      status: item.status,
      error: item.error,
      result: item.result,
      finishedAt: item.finishedAt,
    })),
  };
}

async function fetchBatchXlsx() {
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

async function exportBatchExcel() {
  if (!selectedTitleCount()) {
    toast('先勾选要导出的标题');
    return;
  }
  dom.batchExcelBtn.disabled = true;
  dom.batchExcelBtn.textContent = '生成中…';
  try {
    const base = batchBaseName();
    const blob = await fetchBatchXlsx();
    if (DESKTOP) {
      const base64 = await blobToBase64(blob);
      const saved = await window.desktop.saveExcel({
        defaultName: `${base}.xlsx`,
        base64,
        outputDir: state.rules.outputDir || '',
      });
      if (saved?.ok) {
        toast(
          saved.fallback
            ? `原位置无权限，已改存到 ${saved.path}`
            : 'Excel 已保存',
          'success',
        );
      } else if (!saved?.canceled) {
        toast(saved?.error || 'Excel 保存失败', 'error');
      }
    } else {
      downloadBlob(blob, `${base}.xlsx`);
      toast('Excel 已导出', 'success');
    }
  } catch (error) {
    toast(error.message || 'Excel 导出失败', 'error');
  } finally {
    dom.batchExcelBtn.disabled = false;
    dom.batchExcelBtn.textContent = '导出已选 Excel';
  }
}

function buildBatchCsv() {
  const rows = [['序号', 'SKU', '文件名', '商品名', '平台', '策略', '标题', '对照', '字数', '描述', '关键词']];
  selectedExportItems().forEach((item, index) => {
    const result = item.result;
    const titles = result.titles?.length ? result.titles : [null];
    for (const title of titles) {
      rows.push([
        index + 1,
        item.sku || item.name,
        item.name,
        result.product?.name || '',
        title ? platformShort(title.platform) : '',
        title?.strategyLabel || '',
        title?.text || '',
        title?.translation || '',
        title ? `${title.chars}/${title.limit}` : '',
        result.description?.text || '',
        (result.keywords?.core || []).join('、'),
      ]);
    }
  });
  const escapeCell = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
  return `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}`;
}

async function exportBatchCsv() {
  if (!selectedTitleCount()) {
    toast('先勾选要导出的标题');
    return;
  }
  const base = batchBaseName();
  dom.batchCsvBtn.disabled = true;
  dom.batchCsvBtn.textContent = '生成中…';
  try {
    const csv = buildBatchCsv();
    if (DESKTOP) {
      const saved = await window.desktop.saveTextFile({
        title: '导出批量 CSV',
        defaultName: `${base}.csv`,
        extension: 'csv',
        content: csv,
        outputDir: state.rules.outputDir || '',
        filters: [{ name: 'CSV 表格', extensions: ['csv'] }],
      });
      if (saved?.ok) {
        toast(
          saved.fallback
            ? `原位置无权限，已改存到 ${saved.path}`
            : 'CSV 已保存',
          'success',
        );
      } else if (!saved?.canceled) {
        toast(saved?.error || 'CSV 保存失败', 'error');
      }
    } else {
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
      toast('CSV 已导出', 'success');
    }
  } catch (error) {
    toast(error.message || 'CSV 导出失败', 'error');
  } finally {
    dom.batchCsvBtn.disabled = false;
    dom.batchCsvBtn.textContent = '导出已选 CSV';
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(blob);
  });
}

function buildBatchJson(base) {
  return JSON.stringify({
    title: base,
    generatedAt: new Date().toISOString(),
    rules: state.rules,
    platforms: [...state.selectedPlatforms],
    items: selectedExportItems().map((item) => ({
      sku: item.sku || item.name,
      name: item.name,
      status: item.status,
      error: item.error,
      result: item.result,
    })),
  }, null, 2);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildBatchReportHtml(imagePaths, options = {}) {
  const base = batchBaseName();
  const counts = batchCounts();
  const rules = state.rules;
  const selectable = options.selectable === true;
  const doneItems = selectable
    ? state.batch.items.filter((item) => item.status === 'done' && item.result)
    : selectedExportItems();
  const totalTitles = doneItems.reduce(
    (sum, item) => sum + (item.result?.titles?.length || 0),
    0,
  );
  const cards = doneItems
    .map((item) => {
      const result = item.result;
      const imagePath = imagePaths.get(item.id);
      const selected = selectedTitleIndexes(item);
      const titles = (result.titles || [])
        .map((title, index) => {
          const checked = selectable ? selected.has(index) : true;
          const check = selectable
            ? `<label class="title-check"><input type="checkbox" data-preview-title data-title-index="${index}" ${checked ? 'checked' : ''}></label>`
            : '';
          return `<li class="title-row${checked ? '' : ' is-unselected'}">${check}<span>${escapeHtml(platformShort(title.platform))} · ${escapeHtml(title.strategyLabel)}</span><div><p>${escapeHtml(title.text)}</p>${title.translation ? `<small>${escapeHtml(title.translation)}</small>` : ''}</div><em>${title.chars}/${title.limit} 字</em></li>`;
        })
        .join('');
      const keywords = [...(result.keywords?.core || []), ...(result.keywords?.long_tail || [])]
        .map((keyword) => `<span>${escapeHtml(keyword)}</span>`)
        .join('');
      return `<article class="item" data-item-id="${escapeHtml(item.id)}">
        ${imagePath ? `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(item.name)}">` : ''}
        <div class="item-main">
          <small>SKU ${escapeHtml(item.sku || item.name)} · ${escapeHtml(item.name)}</small>
          <h2>${escapeHtml(result.product?.name || '未命名商品')}</h2>
          <p>${escapeHtml(result.product?.summary || '')}</p>
          <div class="keywords">${keywords}</div>
          <ul class="titles">${titles}</ul>
          ${result.description?.text ? `<p class="desc"><b>描述（${result.description.chars} 字）</b>${escapeHtml(result.description.text)}</p>` : ''}
        </div>
      </article>`;
    })
    .join('');

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(base)} · 批量结果</title>
<style>
  :root{--paper:#f4efe5;--ink:#1e1c18;--muted:#7b7366;--line:#ddd3c2;--accent:#d2553c;--sage:#5d7056}
  *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:13px/1.65 "Noto Sans SC","Microsoft YaHei",sans-serif}
  main{max-width:1100px;margin:0 auto;padding:40px 28px 70px}
  header{border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:24px}
  h1{font-family:"Noto Serif SC","Songti SC",serif;font-size:32px;margin:0 0 8px}
  .meta{color:var(--muted);font-size:11px;display:flex;gap:14px;flex-wrap:wrap}
  .rules{margin-top:12px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:#fbf8f1;font-size:10px;color:var(--muted);line-height:1.8}
  .item{display:grid;grid-template-columns:150px minmax(0,1fr);gap:20px;padding:22px 0;border-bottom:1px solid var(--line)}
  .item img{width:150px;height:150px;object-fit:cover;border-radius:10px;border:1px solid var(--line)}
  .item small{color:var(--muted);font-family:Consolas,monospace;font-size:9px}
  .item h2{font-family:"Noto Serif SC","Songti SC",serif;font-size:22px;margin:4px 0 6px}
  .item p{color:var(--muted);font-size:11px;margin:0}
  .keywords{display:flex;flex-wrap:wrap;gap:4px;margin:9px 0}
  .keywords span{border:1px solid var(--line);border-radius:999px;padding:2px 7px;font-size:9px;color:var(--sage);background:#fff}
  .titles{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:7px}
  .titles li{display:grid;grid-template-columns:86px minmax(0,1fr) 52px;gap:9px;align-items:start;background:#fff;border:1px solid var(--line);border-radius:8px;padding:8px 10px}
  main.selectable .titles li{grid-template-columns:18px 86px minmax(0,1fr) 52px}
  .title-check{display:grid;place-items:center;padding-top:2px}
  .title-check input{width:14px;height:14px;accent-color:var(--accent);cursor:pointer}
  .title-row.is-unselected{opacity:.45}
  .titles span{font-size:9px;color:var(--muted)}
  .titles p{margin:0;color:var(--ink);font-family:"Noto Serif SC","Songti SC",serif;font-size:13px}
  .titles small{display:block;margin-top:2px;color:var(--muted);font-size:9px;line-height:1.55}
  .titles em{font-style:normal;font-family:Consolas,monospace;font-size:8px;color:var(--muted)}
  .desc{margin-top:10px;padding-top:9px;border-top:1px dashed var(--line);line-height:1.8}
  .desc b{color:var(--ink)}
  footer{margin-top:26px;color:var(--muted);font-size:9px}
  @media(max-width:640px){.item{grid-template-columns:1fr}.item img{width:100%;height:180px}.titles li,main.selectable .titles li{grid-template-columns:18px minmax(0,1fr)}.titles em{text-align:right}}
</style></head><body><main class="${selectable ? 'selectable' : ''}">
<header>
  <h1>${escapeHtml(base)}</h1>
  <div class="meta"><span>${counts.done} 张完成 / ${counts.total} 张</span>${selectable ? `<span id="preview-selected-meta">已选 ${selectedTitleCount()} / ${totalTitles} 条</span>` : ''}<span>${escapeHtml(new Date().toLocaleString('zh-CN'))}</span><span>跨多多标题工坊</span></div>
  <div class="rules">中文标题 ${rules.titleMinZh}–${rules.titleMaxZh} 字 · 英文 ${rules.titleMinEn}–${rules.titleMaxEn} 字符 · 描述 ${rules.descriptionMin}–${rules.descriptionMax} 字${rules.mustInclude.length ? ` · 必含：${escapeHtml(rules.mustInclude.join('、'))}` : ''}${rules.bannedWords.length ? ` · 禁用：${escapeHtml(rules.bannedWords.join('、'))}` : ''}</div>
</header>
${cards || '<p>没有已完成的图片。</p>'}
<footer>由「跨多多标题工坊 · 电商标题识图生成」生成。标题与描述为上架草稿，请核对实物、成分、认证与平台规则。${selectable ? '<br>勾选标题后可在此直接导出已选 Excel；保存文件夹时也只保存勾选标题。' : ''}</footer>
</main></body></html>`;
}

async function writeDirectoryFile(directory, name, data) {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

async function collectBatchImageEntries(items = state.batch.items) {
  const images = [];
  const imagePaths = new Map();
  for (const [index, item] of items.entries()) {
    const prefix = String(index + 1).padStart(3, '0');
    if (item.file) {
      const ext = (item.file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg').toLowerCase();
      const baseName = sanitizeFileName(item.name, `image-${index + 1}`).replace(/\.[a-z0-9]+$/i, '');
      const name = `${prefix}-${baseName}${ext}`;
      const filePath = typeof window.desktop?.getPathForFile === 'function'
        ? window.desktop.getPathForFile(item.file)
        : '';
      if (filePath) {
        images.push({ name, path: filePath });
      } else {
        images.push({ name, base64: await blobToBase64(item.file) });
      }
      imagePaths.set(item.id, `images/${name}`);
      continue;
    }
    if (item.sampleId) {
      const baseName = sanitizeFileName(item.name, `sample-${index + 1}`).replace(/\.[a-z0-9]+$/i, '');
      const name = `${prefix}-${baseName}.svg`;
      images.push({ name, sampleId: item.sampleId });
      imagePaths.set(item.id, `images/${name}`);
    }
  }
  return { images, imagePaths };
}

async function saveBatchToFolderDesktop() {
  dom.batchFolderBtn.disabled = true;
  dom.batchFolderBtn.textContent = '保存中…';
  try {
    const base = batchBaseName();
    const blob = await fetchBatchXlsx();
    const xlsxBase64 = await blobToBase64(blob);
    const exportItems = selectedExportItems();
    const collected = state.rules.saveOriginalImages === false
      ? { images: [], imagePaths: new Map() }
      : await collectBatchImageEntries(exportItems);
    const result = await window.desktop.saveBatchPackage({
      baseName: base,
      xlsxBase64,
      images: collected.images,
      previewHtml: buildBatchReportHtml(collected.imagePaths),
      dataJson: buildBatchJson(base),
      outputDir: state.rules.outputDir || '',
    });
    if (result?.ok) {
      toast(
        result.skippedImages
          ? `已保存，${result.skippedImages} 张图片未能写入`
          : '已保存 Excel、图片、预览页到所选文件夹',
        'success',
      );
    } else if (!result?.canceled) {
      toast(result?.error || '保存失败', 'error');
    }
  } catch (error) {
    toast(error.message || '保存失败', 'error');
  } finally {
    dom.batchFolderBtn.disabled = false;
    dom.batchFolderBtn.textContent = '保存已选到文件夹';
  }
}

async function saveBatchToFolder() {
  if (!selectedTitleCount()) {
    toast('先勾选要导出的标题');
    return;
  }
  if (DESKTOP) {
    await saveBatchToFolderDesktop();
    return;
  }
  if (typeof window.showDirectoryPicker !== 'function') {
    toast('当前浏览器不支持选择文件夹，改为下载 Excel');
    await exportBatchExcel();
    return;
  }
  let directory;
  try {
    directory = await window.showDirectoryPicker({ id: 'title-studio-batch', mode: 'readwrite' });
  } catch (error) {
    if (error?.name === 'AbortError') return;
    toast('无法打开文件夹选择器', 'error');
    return;
  }

  dom.batchFolderBtn.disabled = true;
  dom.batchFolderBtn.textContent = '保存中…';
  try {
    const base = batchBaseName();
    const blob = await fetchBatchXlsx();
    await writeDirectoryFile(directory, `${base}.xlsx`, blob);

    const imagePaths = new Map();
    if (state.rules.saveOriginalImages !== false) {
      const images = await directory.getDirectoryHandle('images', { create: true });
      const exportItems = selectedExportItems();
      for (const [index, item] of exportItems.entries()) {
        const prefix = String(index + 1).padStart(3, '0');
        let blobToWrite = null;
        let ext = '.jpg';
        if (item.file) {
          blobToWrite = item.file;
          ext = (item.file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg').toLowerCase();
        } else if (item.sampleId) {
          const sample = state.samples.find((entry) => entry.id === item.sampleId);
          if (sample) {
            try {
              blobToWrite = await fetch(sample.file).then((response) => response.blob());
              ext = '.svg';
            } catch {
              blobToWrite = null;
            }
          }
        }
        if (!blobToWrite) continue;
        const fileName = `${prefix}-${sanitizeFileName(item.name, `image-${index + 1}`).replace(/\.[a-z0-9]+$/i, '')}${ext}`;
        await writeDirectoryFile(images, fileName, blobToWrite);
        imagePaths.set(item.id, `images/${fileName}`);
      }
    }

    await writeDirectoryFile(directory, `${base}-预览.html`, new Blob([buildBatchReportHtml(imagePaths)], { type: 'text/html;charset=utf-8' }));
    await writeDirectoryFile(directory, `${base}-数据.json`, new Blob([buildBatchJson(base)], { type: 'application/json;charset=utf-8' }));
    toast('已保存 Excel、图片、预览页到所选文件夹', 'success');
  } catch (error) {
    if (error?.name !== 'AbortError') toast(error.message || '保存失败', 'error');
  } finally {
    dom.batchFolderBtn.disabled = false;
    dom.batchFolderBtn.textContent = '保存已选到文件夹';
  }
}

/* ------------------------------------------------------------------ */
/*  generate                                                          */
/* ------------------------------------------------------------------ */

function requestSettings() {
  const { provider, baseUrl, model, apiKey, temperature } = state.settings;
  return { provider, baseUrl, model, apiKey, temperature };
}

function handlePrimaryAction() {
  if (state.batchMode) {
    startBatch();
  } else {
    generate();
  }
}

async function generate() {
  if (state.busy) return;
  if (!state.image) {
    toast('先上传一张商品图，或选一个示例');
    dom.dropzone.focus();
    return;
  }
  if (!state.selectedPlatforms.size) {
    toast('至少选择一个发布平台');
    return;
  }
  if (!state.selectedStrategies.size) {
    toast('至少选择一个标题策略');
    return;
  }

  const provider = state.settings.provider;
  if (provider === 'demo' && !state.image.sampleId) {
    toast('演示模式只识别内置示例图');
    openSettings('当前是演示模式。想看自己的图，请配置视觉模型；或点左侧示例先体验流程。');
    return;
  }
  if (provider !== 'demo' && !isModelReady()) {
    toast('视觉模型还没有配置好');
    openSettings('填写接口地址、模型名称与 API Key 后，就可以识别自己的商品图。');
    return;
  }

  setGenerateBusy(true);
  startLoading();
  const startedAt = Date.now();
  const platforms = [...state.selectedPlatforms];
  const strategies = [...state.selectedStrategies];

  try {
    let result;
    if (provider === 'demo') {
      const data = await postJson(
        '/api/demo',
        { sampleId: state.image.sampleId, platforms, strategies, rules: state.rules },
        30_000,
      );
      result = data.result;
    } else {
      const image = await ensureAnalysisImage();
      const data = await postJson(
        '/api/analyze',
        {
          image,
          brief: collectBrief(),
          platforms,
          strategies,
          rules: state.rules,
          settings: requestSettings(),
        },
        240_000,
      );
      result = data.result;
    }
    const elapsed = Date.now() - startedAt;
    if (elapsed < 900) await delay(900 - elapsed);
    const totalElapsed = Date.now() - startedAt;
    stopLoading();
    setGenerateBusy(false);
    showResult(result, totalElapsed);
  } catch (error) {
    stopLoading();
    setGenerateBusy(false);
    const message = error?.message || '生成失败，请重试';
    const title =
      error?.code === 'CONFIG_REQUIRED'
        ? '模型还没有配置好'
        : error?.code === 'AUTH_FAILED'
          ? 'API Key 没有通过验证'
          : error?.code === 'UPSTREAM_TIMEOUT'
            ? '模型响应超时'
            : error?.code === 'BAD_MODEL_JSON'
              ? '模型没有按格式返回'
              : '生成没有完成';
    showError(title, message, error?.detail || (error?.code ? `错误码：${error.code}` : ''));
  }
}

/* ------------------------------------------------------------------ */
/*  history                                                           */
/* ------------------------------------------------------------------ */

function renderHistoryCount() {
  dom.historyCount.textContent = String(state.history.length);
  dom.historyCount.hidden = state.history.length === 0;
}

function renderHistory() {
  dom.historyList.replaceChildren();
  if (!state.history.length) {
    const empty = el('div', 'history-empty');
    empty.append(icon('history'));
    empty.append(el('p', '', '还没有生成记录。\n完成一次生成后，结果会保存在这里。'));
    dom.historyList.append(empty);
    renderHistoryCount();
    return;
  }

  for (const entry of state.history) {
    const item = el('article', 'history-item');
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `打开历史：${entry.name || '未命名'}`);

    const thumb = el('div', 'history-thumb');
    const img = el('img');
    img.src = entry.thumb || entry.imageData || '/favicon.svg';
    img.alt = entry.name || '历史商品图';
    img.loading = 'lazy';
    thumb.append(img);

    const main = el('div', 'history-main');
    main.append(el('div', 'history-title', entry.name || '未命名商品'));
    const meta = el('div', 'history-meta');
    meta.append(el('span', '', formatDate(entry.at)));
    meta.append(el('em', '', `${entry.result.titleCount || entry.result.titles?.length || 0} 条`));
    const platformNames = (entry.platforms || [])
      .map((id) => state.platforms.find((platform) => platform.id === id)?.short)
      .filter(Boolean)
      .slice(0, 3);
    if (platformNames.length) meta.append(el('span', '', platformNames.join(' / ')));
    main.append(meta);

    const remove = el('button', 'history-delete');
    remove.type = 'button';
    remove.title = '删除这条记录';
    remove.setAttribute('aria-label', '删除这条记录');
    remove.append(icon('trash'));
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      state.history = state.history.filter((historyEntry) => historyEntry.id !== entry.id);
      writeStoredJson(STORAGE.history, state.history);
      renderHistory();
    });

    item.append(thumb, main, remove);
    item.addEventListener('click', () => restoreHistory(entry));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        restoreHistory(entry);
      }
    });
    dom.historyList.append(item);
  }
  renderHistoryCount();
}

async function addHistory(result) {
  try {
    const image = state.image;
    const sampleId = image?.sampleId || '';
    const thumb = sampleId
      ? state.samples.find((sample) => sample.id === sampleId)?.file || ''
      : image?.dataUrl
        ? await makeThumb(image.dataUrl, 320, 0.72)
        : '';
    const imageData = sampleId
      ? ''
      : image?.dataUrl
        ? await makeThumb(image.dataUrl, 900, 0.78)
        : '';

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      name: result.product?.name || '未命名商品',
      sampleId,
      thumb,
      imageData,
      width: image?.width || 0,
      height: image?.height || 0,
      size: image?.size || 0,
      brief: collectBrief(),
      platforms: [...state.selectedPlatforms],
      strategies: [...state.selectedStrategies],
      result,
    };

    state.history = [entry, ...state.history.filter((item) => item.name !== entry.name || item.at < entry.at - 60_000)];
    state.history = state.history.slice(0, 12);
    let saved = writeStoredJson(STORAGE.history, state.history);
    while (!saved && state.history.length > 1) {
      state.history.pop();
      saved = writeStoredJson(STORAGE.history, state.history);
    }
    renderHistory();
  } catch (error) {
    console.warn('history save failed', error);
  }
}

function restoreHistory(entry) {
  if (!entry?.result) return;
  state.result = entry.result;
  state.image = {
    sampleId: entry.sampleId || null,
    previewUrl: entry.imageData || entry.thumb || state.samples.find((sample) => sample.id === entry.sampleId)?.file || '',
    dataUrl: entry.imageData || null,
    width: entry.width || 0,
    height: entry.height || 0,
    name: entry.name || '商品图',
    size: entry.size || 0,
  };
  updatePreviewUI();
  if (entry.brief) {
    dom.categoryInput.value = entry.brief.category || '';
    dom.brandInput.value = entry.brief.brand || '';
    dom.sellingInput.value = entry.brief.sellingPoints || '';
    dom.audienceInput.value = entry.brief.audience || '';
  }
  if (Array.isArray(entry.platforms) && entry.platforms.length) {
    state.selectedPlatforms = new Set(entry.platforms);
  }
  if (Array.isArray(entry.strategies) && entry.strategies.length) {
    state.selectedStrategies = new Set(entry.strategies);
  }
  renderPlatformChips();
  renderStrategyChips();
  const counts = entry.result.platformCounts || {};
  state.activePlatform =
    state.platforms.find(
      (platform) => (entry.platforms || []).includes(platform.id) && (counts[platform.id] || 0) > 0,
    )?.id || state.platforms[0]?.id || null;
  dom.emptyState.hidden = true;
  dom.errorState.hidden = true;
  dom.resultContent.hidden = false;
  dom.resultTools.hidden = false;
  dom.resultHeading.textContent = entry.result.product?.name || '历史结果';
  dom.resultSub.textContent = `${entry.result.titleCount || entry.result.titles?.length || 0} 条标题 · 历史记录 · ${formatDate(entry.at)}`;
  saveBriefSoon();
  dom.crumbCurrent.textContent = entry.name || '历史结果';
  dom.resultModel.textContent = `${entry.result.meta?.demo ? '内置示例' : entry.result.meta?.model || '视觉模型'} · ${formatDate(entry.at)}`;
  dom.resultFootNote.textContent = entry.result.meta?.demo
    ? '示例标题由人工撰写，仅用于体验流程；上架前请核对实物信息与平台规则。'
    : '标题由 AI 生成，上架前请核对实物信息与平台规则。';
  renderDemoBanner(entry.result);
  renderInsight(entry.result);
  renderTabs();
  renderTitles();
  renderDescription(entry.result);
  renderKeywords();
  renderCompliance();
  closeDrawers();
  dom.resultCol.scrollTo({ top: 0, behavior: 'smooth' });
  toast('已恢复历史结果');
}

/* ------------------------------------------------------------------ */
/*  settings drawer                                                   */
/* ------------------------------------------------------------------ */

function presetsForUi() {
  const list = [...PRESETS];
  if (state.envConfigured) {
    list.splice(1, 0, {
      id: 'env',
      name: '服务端模型',
      note: '读取环境变量',
      baseUrl: '',
      model: state.envModel,
    });
  }
  return list;
}

function renderPresets() {
  dom.presetGrid.replaceChildren();
  const provider = state.draft?.provider || state.settings.provider;
  for (const preset of presetsForUi()) {
    const button = el('button', `preset-card${preset.id === provider ? ' is-active' : ''}`);
    button.type = 'button';
    button.dataset.id = preset.id;
    button.append(el('span', 'preset-name', preset.name));
    button.append(el('span', 'preset-note', preset.note));
    const support = VISION_SUPPORT[preset.id] || 'depends';
    button.append(
      el(
        'span',
        `preset-badge${support === 'vision' ? ' is-vision' : support === 'demo' ? ' is-demo' : ' is-depends'}`,
        support === 'vision' ? '视觉' : support === 'demo' ? '示例' : '看模型',
      ),
    );
    button.addEventListener('click', () => applyPreset(preset));
    dom.presetGrid.append(button);
  }
}

function applyPreset(preset) {
  if (!state.draft) return;
  const previous = state.draft.provider;
  state.draft.provider = preset.id;

  if (preset.id === 'demo') {
    state.draft.baseUrl = '';
    state.draft.model = '';
    state.draft.apiKey = '';
  } else if (preset.id === 'env') {
    state.draft.baseUrl = '';
    state.draft.model = state.envModel;
    state.draft.apiKey = '';
  } else if (preset.id !== 'custom') {
    if (previous !== preset.id) state.draft.apiKey = '';
    state.draft.baseUrl = preset.baseUrl;
    state.draft.model = preset.model;
  }

  syncSettingsFields();
  renderPresets();
  dom.testResult.className = 'test-result';
  dom.testResult.textContent = '';
}

function syncSettingsFields() {
  if (!state.draft) return;
  dom.baseUrlInput.value = state.draft.baseUrl || '';
  dom.modelInput.value = state.draft.model || '';
  const providerHint = PROVIDER_HINTS[state.draft.provider];
  dom.modelHint.hidden = !providerHint;
  if (providerHint) {
    dom.modelInput.placeholder = providerHint.placeholder;
    if (providerHint.html) dom.modelHint.innerHTML = providerHint.html;
    else dom.modelHint.textContent = providerHint.text;
  } else {
    dom.modelInput.placeholder = '选择预设或填写模型名';
    dom.modelHint.replaceChildren();
  }
  dom.apiKeyInput.value = state.draft.apiKey || '';
  dom.temperatureInput.value = String(state.draft.temperature ?? 0.65);
  dom.tempOutput.textContent = Number(state.draft.temperature ?? 0.65).toFixed(2);
}

function openSettings(hint = '') {
  openDrawer(dom.settingsDrawer);
  state.draft = { ...state.settings };
  syncSettingsFields();
  renderPresets();
  dom.testResult.className = 'test-result';
  dom.testResult.textContent = hint || '';
  setTimeout(() => dom.baseUrlInput.focus(), 120);
}

function openHistory() {
  renderHistory();
  openDrawer(dom.historyDrawer);
}

function openDrawer(drawer) {
  closeDrawers();
  dom.drawerBackdrop.hidden = false;
  requestAnimationFrame(() => dom.drawerBackdrop.classList.add('is-open'));
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDrawers() {
  const drawers = [dom.settingsDrawer, dom.historyDrawer, dom.rulesDrawer].filter(Boolean);
  for (const drawer of drawers) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  dom.drawerBackdrop.classList.remove('is-open');
  setTimeout(() => {
    if (!drawers.some((drawer) => drawer.classList.contains('is-open'))) {
      dom.drawerBackdrop.hidden = true;
    }
  }, 300);
  document.body.style.overflow = '';
  state.draft = null;
  state.rulesDraft = null;
}

function readDraftFromFields() {
  if (!state.draft) state.draft = { ...state.settings };
  state.draft.baseUrl = dom.baseUrlInput.value.trim();
  state.draft.model = dom.modelInput.value.trim();
  state.draft.apiKey = dom.apiKeyInput.value.trim();
  state.draft.temperature = Number(dom.temperatureInput.value) || 0;
  return state.draft;
}

function validateDraft(draft) {
  if (draft.provider === 'demo') return '';
  if (draft.provider === 'env') {
    return state.envConfigured ? '' : '服务端没有配置模型环境变量';
  }
  if (!draft.baseUrl) return '请填写接口地址';
  if (!/^https?:\/\//i.test(draft.baseUrl)) return '接口地址要以 http:// 或 https:// 开头';
  if (!draft.model) return '请填写模型名称';
  if (!draft.apiKey && draft.provider !== 'ollama' && !isKeyOptional(draft.baseUrl)) {
    return '请填写 API Key（本地地址可留空）';
  }
  return '';
}

function saveSettings() {
  const draft = readDraftFromFields();
  const error = validateDraft(draft);
  if (error) {
    toast(error, 'error');
    dom.testResult.className = 'test-result is-error';
    dom.testResult.textContent = error;
    return;
  }
  state.settings = { ...draft };
  writeStoredJson(STORAGE.settings, state.settings);
  updateModelPill();
  closeDrawers();
  toast(draft.provider === 'demo' ? '已切换到演示模式' : '模型设置已保存', 'success');
}

function updateModelPill() {
  const settings = state.settings;
  let tone = 'error';
  let text = '未配置模型';
  let title = '点击配置视觉模型';

  if (settings.provider === 'demo') {
    tone = 'demo';
    text = '演示模式';
    title = '当前使用内置示例数据，点击配置视觉模型';
  } else if (settings.provider === 'env') {
    if (state.envConfigured) {
      tone = 'ready';
      text = '服务端模型';
      title = state.envModel ? `环境变量模型：${state.envModel}` : '使用服务端环境变量中的模型';
    } else {
      tone = 'error';
      text = '服务端未配置';
      title = '没有检测到 VISION_* 环境变量';
    }
  } else if (isModelReady(settings)) {
    tone = 'ready';
    const model = settings.model || '';
    text = model.length > 24 ? `${model.slice(0, 24)}…` : model;
    title = `${settings.provider} · ${settings.model}`;
  } else if (settings.baseUrl || settings.model) {
    tone = 'error';
    text = '配置不完整';
    title = '检查接口地址、模型名与 API Key';
  }

  dom.modelPill.dataset.tone = tone;
  dom.modelPillText.textContent = text;
  dom.modelPill.title = title;
}

async function testConnection() {
  const draft = readDraftFromFields();
  const error = validateDraft(draft);
  if (error) {
    dom.testResult.className = 'test-result is-error';
    dom.testResult.textContent = error;
    return;
  }
  if (draft.provider === 'demo') {
    dom.testResult.className = 'test-result';
    dom.testResult.textContent = '演示模式不需要连接；保存后即可用示例体验。';
    return;
  }

  dom.testBtn.disabled = true;
  dom.testBtn.textContent = '测试中…';
  dom.testResult.className = 'test-result';
  dom.testResult.textContent = '正在连接…';
  try {
    const data = await postJson('/api/test', { settings: draft }, 65_000);
    const latency = data.latencyMs ? `${data.latencyMs} ms` : '';
    let message = `已连通${latency ? ` · ${latency}` : ''}`;
    if (data.mode === 'models' && data.modelFound === false) {
      message += '；但模型列表里没有这个名称，请核对';
    }
    if (data.note) message += `（${data.note}）`;
    dom.testResult.className = 'test-result is-ok';
    dom.testResult.textContent = message;
  } catch (errorValue) {
    dom.testResult.className = 'test-result is-error';
    dom.testResult.textContent = errorValue.message || '连接失败';
  } finally {
    dom.testBtn.disabled = false;
    dom.testBtn.textContent = '测试连接';
  }
}

/* ------------------------------------------------------------------ */
/*  export / clipboard                                                */
/* ------------------------------------------------------------------ */

async function copyText(value) {
  const text = String(value ?? '');
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

async function exportCsv() {
  if (!state.result) return;
  const rows = [['平台', '策略', '标题', '对照', '字数', '字符上限', '长度达标', '综合分', '风险提示', '商品描述', '描述字数']];
  for (const title of state.result.titles) {
    const platform = state.platforms.find((item) => item.id === title.platform);
    rows.push([
      platform?.name || title.platform,
      title.strategyLabel,
      title.text,
      title.translation || '',
      String(title.chars),
      String(title.limit),
      title.lengthOk === false ? '低于下限' : '达标',
      String(title.score?.overall ?? ''),
      (title.warnings || []).join('、'),
      state.result.description?.text || '',
      String(state.result.description?.chars ?? ''),
    ]);
  }
  const escapeCell = (cell) => `"${String(cell).replace(/"/g, '""')}"`;
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}`;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `跨多多标题工坊-${stamp}.csv`;

  if (DESKTOP) {
    try {
      const saved = await window.desktop.saveTextFile({
        title: '导出 CSV',
        defaultName: filename,
        extension: 'csv',
        content: csv,
        outputDir: state.rules.outputDir || '',
        filters: [{ name: 'CSV 表格', extensions: ['csv'] }],
      });
      if (saved?.ok) {
        toast(
          saved.fallback
            ? `原位置无权限，已改存到 ${saved.path}`
            : 'CSV 已保存',
          'success',
        );
      } else if (!saved?.canceled) {
        toast(saved?.error || 'CSV 保存失败', 'error');
      }
    } catch (error) {
      toast(error.message || 'CSV 保存失败', 'error');
    }
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  toast('CSV 已导出', 'success');
}

/* ------------------------------------------------------------------ */
/*  toast / help                                                      */
/* ------------------------------------------------------------------ */

function toast(message, tone = '') {
  const node = el('div', `toast${tone ? ` is-${tone}` : ''}`, message);
  dom.toastRegion.append(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 260);
  }, 2600);
  while (dom.toastRegion.children.length > 3) dom.toastRegion.firstElementChild?.remove();
}

function openHelp() {
  if (typeof dom.helpDialog.showModal === 'function') dom.helpDialog.showModal();
  else dom.helpDialog.setAttribute('open', '');
}

function closeHelp() {
  if (typeof dom.helpDialog.close === 'function') dom.helpDialog.close();
  else dom.helpDialog.removeAttribute('open');
}

/* ------------------------------------------------------------------ */
/*  events                                                            */
/* ------------------------------------------------------------------ */

async function extractDroppedFiles(dataTransfer) {
  const files = [...(dataTransfer?.files || [])];
  const items = [...(dataTransfer?.items || [])];
  const entries = items
    .map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
    .filter(Boolean);
  if (!entries.length) return files;

  const collected = [];
  const walk = async (entry) => {
    if (!entry) return;
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      collected.push(file);
      return;
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      while (true) {
        const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
        if (!batch.length) break;
        for (const child of batch) await walk(child);
      }
    }
  };
  for (const entry of entries) {
    try {
      await walk(entry);
    } catch {
      // 忽略单个无法读取的目录项，继续处理其余文件
    }
  }
  return collected.length ? collected : files;
}

function bindEvents() {
  dom.dropzone.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    if (state.batchMode) dom.batchFileInput.click();
    else dom.fileInput.click();
  });
  dom.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (state.batchMode) dom.batchFileInput.click();
      else dom.fileInput.click();
    }
  });
  dom.fileInput.addEventListener('change', () => {
    const file = dom.fileInput.files?.[0];
    if (file) handleFile(file);
  });
  dom.folderInput.addEventListener('change', () => {
    addBatchFiles(dom.folderInput.files);
    dom.folderInput.value = '';
  });
  dom.batchFileInput.addEventListener('change', () => {
    addBatchFiles(dom.batchFileInput.files);
    dom.batchFileInput.value = '';
  });
  dom.changeImage.addEventListener('click', (event) => {
    event.stopPropagation();
    dom.fileInput.click();
  });
  dom.removeImage.addEventListener('click', (event) => {
    event.stopPropagation();
    clearImage();
  });

  let dragDepth = 0;
  dom.dropzone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragDepth += 1;
    dom.dropzone.classList.add('is-dragging');
  });
  dom.dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
  dom.dropzone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dom.dropzone.classList.remove('is-dragging');
  });
  dom.dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dragDepth = 0;
    dom.dropzone.classList.remove('is-dragging');
    if (state.batchMode) {
      extractDroppedFiles(event.dataTransfer)
        .then((files) => addBatchFiles(files))
        .catch(() => toast('文件夹读取失败，试试「选择文件夹」', 'error'));
      return;
    }
    const file = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith('image/'));
    if (file) handleFile(file);
    else toast('拖入的文件不是图片', 'error');
  });

  document.addEventListener('dragover', (event) => {
    if ([...(event.dataTransfer?.types || [])].includes('Files')) event.preventDefault();
  });
  document.addEventListener('drop', (event) => {
    if (!dom.dropzone.contains(event.target)) event.preventDefault();
  });
  document.addEventListener('paste', (event) => {
    if (state.busy) return;
    const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile();
    if (!file) return;
    event.preventDefault();
    if (state.batchMode) addBatchFiles([file]);
    else handleFile(file);
  });

  $$('button', dom.modeSwitch).forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  dom.generateBtn.addEventListener('click', handlePrimaryAction);
  dom.regenerateBtn.addEventListener('click', generate);
  dom.retryBtn.addEventListener('click', generate);
  dom.exportBtn.addEventListener('click', exportCsv);
  dom.errorSettingsBtn.addEventListener('click', () => openSettings());
  dom.demoConfigBtn.addEventListener('click', () => openSettings());
  dom.modelPill.addEventListener('click', () => openSettings());
  dom.settingsBtn.addEventListener('click', () => openSettings());

  const closeTopMenu = () => {
    dom.topMenu.querySelectorAll('.top-menu-item.is-open').forEach((item) => {
      item.classList.remove('is-open');
      item.querySelector('.top-menu-trigger')?.setAttribute('aria-expanded', 'false');
    });
  };
  dom.topMenu.addEventListener('click', async (event) => {
    const trigger = event.target.closest('.top-menu-trigger');
    if (trigger) {
      event.stopPropagation();
      const item = trigger.closest('.top-menu-item');
      const willOpen = !item.classList.contains('is-open');
      closeTopMenu();
      if (willOpen) {
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }
    const action = event.target.closest('[data-menu-action]');
    if (!action) return;
    closeTopMenu();
    const name = action.dataset.menuAction;
    try {
      if (window.desktop?.menuAction) await window.desktop.menuAction(name);
      else toast('这些菜单只在桌面版可用', 'error');
    } catch (error) {
      toast(error.message || '菜单操作失败', 'error');
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#topMenu')) closeTopMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTopMenu();
  });

  dom.categoryInput.addEventListener('input', saveBriefSoon);
  dom.targetCategorySelect.addEventListener('change', saveTargetCategory);
  dom.customCategoryInput.addEventListener('input', saveTargetCategory);
  dom.sellingInput.addEventListener('input', saveBriefSoon);
  dom.audienceInput.addEventListener('input', saveBriefSoon);
  dom.brandInput.addEventListener('input', () => {
    saveBriefSoon();
    if (!dom.brandInput.value.trim()) state.selectedStrategies.delete('brand');
    renderStrategyChips();
  });

  $$('.rail-item').forEach((button) => {
    button.addEventListener('click', () => {
      const nav = button.dataset.nav;
      if (nav === 'history') openHistory();
      else if (nav === 'settings') openSettings();
      else if (nav === 'help') openHelp();
      else if (nav === 'studio') {
        closeDrawers();
        dom.briefScroll.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  dom.pickFolderBtn.addEventListener('click', () => dom.folderInput.click());
  dom.pickBatchFilesBtn.addEventListener('click', () => dom.batchFileInput.click());
  dom.emptyPickFolderBtn.addEventListener('click', () => {
    if (!state.batchMode) setMode('batch');
    dom.folderInput.click();
  });
  dom.loadSampleBatchBtn.addEventListener('click', addBatchSamples);
  dom.emptyLoadSamplesBtn.addEventListener('click', addBatchSamples);
  dom.batchFilterInput.addEventListener('input', () => {
    state.batch.filter = dom.batchFilterInput.value;
    renderBatchList();
    updateBatchFilterUi();
  });
  dom.batchFilterClear.addEventListener('click', () => {
    state.batch.filter = '';
    dom.batchFilterInput.value = '';
    renderBatchList();
    updateBatchFilterUi();
  });
  dom.batchPreviewBtn.addEventListener('click', openBatchPreview);
  dom.batchPreviewClose.addEventListener('click', closeBatchPreview);
  dom.batchPreviewModal.addEventListener('click', (event) => {
    if (event.target === dom.batchPreviewModal) closeBatchPreview();
  });
  dom.batchPreviewFrame.addEventListener('load', bindBatchPreviewSelection);
  dom.batchPreviewExcelBtn.addEventListener('click', () => {
    closeBatchPreview();
    exportBatchExcel();
  });
  dom.batchPreviewSaveBtn.addEventListener('click', () => {
    closeBatchPreview();
    saveBatchToFolder();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dom.batchPreviewModal.hidden) closeBatchPreview();
  });
  dom.batchStartBtn.addEventListener('click', startBatch);
  dom.batchPreprocessBtn.addEventListener('click', preprocessBatchOnly);
  dom.batchStopBtn.addEventListener('click', stopBatch);
  dom.batchExcelBtn.addEventListener('click', exportBatchExcel);
  dom.batchCsvBtn.addEventListener('click', exportBatchCsv);
  dom.batchFolderBtn.addEventListener('click', saveBatchToFolder);
  dom.batchClearBtn.addEventListener('click', clearBatch);
  for (const field of [
    dom.batchPrefix,
    dom.batchSuffix,
    dom.batchConcurrency,
    dom.batchImageEdge,
    dom.batchResizeMode,
    dom.batchAssetMode,
    dom.batchTargetLength,
    dom.batchLanguage,
    dom.batchBannedWords,
    dom.batchSaveOriginals,
  ]) {
    field.addEventListener('change', readBatchFields);
  }
  for (const field of [
    dom.batchPrefix,
    dom.batchSuffix,
    dom.batchTargetLength,
    dom.batchBannedWords,
  ]) {
    field.addEventListener('input', readBatchFields);
  }
  dom.batchCustomPrompt.addEventListener('input', () => {
    dom.batchPromptPreset.value = 'custom';
    readBatchFields();
  });
  dom.batchPromptPreset.addEventListener('change', () => {
    const preset = PROMPT_PRESETS[dom.batchPromptPreset.value];
    if (preset) {
      dom.batchCustomPrompt.value = preset;
      readBatchFields();
    }
  });
  dom.batchSaveSettingsBtn.addEventListener('click', () => {
    readBatchFields();
    syncBatchSettings();
    toast('批量设置已保存，前缀/后缀会固定生效', 'success');
  });
  dom.batchSaveTemplateBtn.addEventListener('click', saveBatchTemplate);
  dom.batchLoadTemplateBtn.addEventListener('click', () => dom.templateFileInput.click());
  dom.templateFileInput.addEventListener('change', async () => {
    const file = dom.templateFileInput.files?.[0];
    try {
      await loadBatchTemplateFile(file);
    } catch (error) {
      toast(error.message || '模板载入失败', 'error');
    } finally {
      dom.templateFileInput.value = '';
    }
  });
  dom.batchChooseDir.addEventListener('click', chooseBatchOutputDir);
  dom.batchRulesBtn.addEventListener('click', openRules);

  dom.rulesSummaryBtn.addEventListener('click', openRules);
  dom.openRulesFromSettings.addEventListener('click', openRules);
  dom.closeRules.addEventListener('click', closeDrawers);
  dom.saveRulesBtn.addEventListener('click', saveRules);
  dom.resetRulesBtn.addEventListener('click', () => {
    state.rulesDraft = { ...DEFAULT_RULES, mustInclude: [], bannedWords: [], keywordCombos: [] };
    fillRulesFields();
    toast('已恢复默认值，保存后生效');
  });

  dom.closeSettings.addEventListener('click', closeDrawers);
  dom.closeHistory.addEventListener('click', closeDrawers);
  dom.drawerBackdrop.addEventListener('click', closeDrawers);
  dom.saveSettingsBtn.addEventListener('click', saveSettings);
  dom.testBtn.addEventListener('click', testConnection);
  dom.useDemoBtn.addEventListener('click', () => {
    state.settings = { ...DEFAULT_SETTINGS };
    writeStoredJson(STORAGE.settings, state.settings);
    updateModelPill();
    closeDrawers();
    toast('已切换到演示模式');
  });

  dom.toggleKey.addEventListener('click', () => {
    const showing = dom.apiKeyInput.type === 'text';
    dom.apiKeyInput.type = showing ? 'password' : 'text';
    dom.toggleKey.replaceChildren(icon(showing ? 'eye' : 'eye-off'));
  });

  dom.temperatureInput.addEventListener('input', () => {
    if (!state.draft) return;
    state.draft.temperature = Number(dom.temperatureInput.value);
    dom.tempOutput.textContent = state.draft.temperature.toFixed(2);
  });

  dom.clearHistory.addEventListener('click', () => {
    if (!state.history.length) return;
    if (!state.historyClearArmed) {
      state.historyClearArmed = true;
      dom.clearHistory.textContent = '再点一次清空';
      setTimeout(() => {
        state.historyClearArmed = false;
        dom.clearHistory.textContent = '清空历史';
      }, 2800);
      return;
    }
    state.history = [];
    writeStoredJson(STORAGE.history, []);
    renderHistory();
    toast('历史已清空');
  });

  dom.closeHelp.addEventListener('click', closeHelp);
  dom.helpCloseBtn.addEventListener('click', closeHelp);
  dom.helpDialog.addEventListener('click', (event) => {
    if (event.target === dom.helpDialog) closeHelp();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (dom.helpDialog.open) closeHelp();
      else closeDrawers();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      if (
        dom.helpDialog.open ||
        dom.settingsDrawer.classList.contains('is-open') ||
        dom.historyDrawer.classList.contains('is-open') ||
        dom.rulesDrawer.classList.contains('is-open')
      ) {
        return;
      }
      event.preventDefault();
      handlePrimaryAction();
    }
  });

  window.addEventListener('online', () => toast('网络已恢复', 'success'));
  window.addEventListener('offline', () => toast('网络已断开，模型请求可能失败', 'error'));
}

/* ------------------------------------------------------------------ */
/*  boot                                                              */
/* ------------------------------------------------------------------ */

async function boot() {
  if (DESKTOP) document.documentElement.classList.add('is-desktop');
  cacheDom();
  bindEvents();

  const savedSettings = loadSettings();
  state.rules = loadRules();
  state.history = loadHistory();
  restoreBrief();

  await loadMeta();
  renderHistory();
  renderRulesSummary();
  syncBatchSettings();
  syncTargetCategoryFields();

  if (!savedSettings && state.envConfigured) {
    state.settings = {
      ...DEFAULT_SETTINGS,
      provider: 'env',
      model: state.envModel,
    };
  } else if (savedSettings) {
    state.settings = savedSettings;
  }

  renderPlatformChips();
  renderStrategyChips();
  renderSamples();
  updateModelPill();
  updateGenerateMeta();
  setGenerateBusy(false);

  const params = new URLSearchParams(location.search);
  if (params.get('batch') === '1') {
    setMode('batch');
    addBatchSamples(true);
    if (params.get('run') === '1') setTimeout(() => startBatch(), 700);
    return;
  }
  const sampleId = params.get('sample');
  if (sampleId) {
    const sample = state.samples.find((item) => item.id === sampleId);
    if (sample) {
      selectSample(sample.id);
      if (params.get('run') === '1') setTimeout(() => generate(), 700);
    }
  }
}

boot().catch((error) => {
  console.error(error);
  toast('页面初始化失败，请刷新重试', 'error');
});

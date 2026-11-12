/**
 * 平台规则与标题策略。
 * 字数为「建议上限」，平台规则会调整；真正上架前以商家后台提示为准。
 */
export const PLATFORM_ORDER = ['taobao', 'pdd', 'douyin', 'jd', 'temu', 'amazon'];

export const PLATFORMS = Object.freeze({
  taobao: {
    id: 'taobao',
    short: '淘宝',
    name: '淘宝 / 天猫',
    lang: 'zh',
    maxChars: 30,
    maxBytes: 60,
    hint: '30 字以内 · 核心词前置',
    tone: '搜索词覆盖 + 点击欲',
  },
  pdd: {
    id: 'pdd',
    short: '拼多多',
    name: '拼多多',
    lang: 'zh',
    maxChars: 30,
    maxBytes: 60,
    hint: '30 字以内 · 直给卖点',
    tone: '利益点明确，少绕弯',
  },
  douyin: {
    id: 'douyin',
    short: '抖店',
    name: '抖音商城 / 抖店',
    lang: 'zh',
    maxChars: 30,
    maxBytes: 60,
    hint: '30 字以内 · 场景口语化',
    tone: '画面感 + 人群语境',
  },
  jd: {
    id: 'jd',
    short: '京东',
    name: '京东',
    lang: 'zh',
    maxChars: 30,
    maxBytes: 60,
    hint: '30 字以内 · 参数清晰',
    tone: '规格、材质、型号优先',
  },
  temu: {
    id: 'temu',
    short: 'TEMU',
    name: 'TEMU',
    lang: 'en',
    maxChars: 120,
    maxBytes: null,
    hint: '≤120 字符 · 自然英文',
    tone: '关键词 + 使用场景',
  },
  amazon: {
    id: 'amazon',
    short: 'Amazon',
    name: 'Amazon',
    lang: 'en',
    maxChars: 200,
    maxBytes: null,
    hint: '≤200 字符 · 可读性优先',
    tone: '核心词 + 属性 + 场景',
  },
});

export const STRATEGIES = Object.freeze([
  {
    id: 'flow',
    label: '流量型',
    short: '流量',
    desc: '大词覆盖，争取搜索曝光',
    instruction: '覆盖品类核心词与高频搜索词，核心词尽量前置；不堆砌。',
  },
  {
    id: 'convert',
    label: '转化型',
    short: '转化',
    desc: '卖点 + 场景，提升点击',
    instruction: '把最具体的 1-2 个卖点写清楚，用规格/材质/效果支撑，避免空泛形容词。',
  },
  {
    id: 'brand',
    label: '品牌型',
    short: '品牌',
    desc: '品牌或调性背书',
    instruction: '仅在用户提供品牌名时使用品牌词；没有品牌名时改用风格与调性词，不虚构品牌。',
  },
  {
    id: 'longtail',
    label: '长尾型',
    short: '长尾',
    desc: '细分场景，避开红海',
    instruction: '用细分人群、使用场景或风格切入，牺牲部分大词换取精准度。',
  },
]);

export const STRATEGY_BY_ID = Object.freeze(
  Object.fromEntries(STRATEGIES.map((strategy) => [strategy.id, strategy])),
);

export const STRATEGY_LABELS = Object.freeze(
  Object.fromEntries(STRATEGIES.map((strategy) => [strategy.label, strategy.id])),
);

export function listPlatforms() {
  return PLATFORM_ORDER.map((id) => ({ ...PLATFORMS[id] }));
}

export function resolvePlatformIds(input) {
  if (!Array.isArray(input)) return ['taobao', 'temu'];
  const ids = input
    .map((value) => String(value || '').toLowerCase())
    .map((value) => {
      if (value === 'tmall' || value === 'taobao/tmall') return 'taobao';
      if (value === 'pinduoduo') return 'pdd';
      if (value === 'doudian' || value === 'douyin') return 'douyin';
      if (value === 'jingdong') return 'jd';
      return value;
    })
    .filter((id) => Boolean(PLATFORMS[id]));
  return [...new Set(ids)].slice(0, PLATFORM_ORDER.length);
}

export function resolveStrategyIds(input) {
  if (!Array.isArray(input)) return ['flow', 'convert', 'longtail'];
  const ids = [];
  for (const value of input) {
    const raw = String(value || '').trim();
    const id = STRATEGY_BY_ID[raw]
      ? raw
      : STRATEGY_LABELS[raw] ||
        (raw.toLowerCase().replace(/[\s_-]+/g, '') === 'longtail' ? 'longtail' : null);
    if (id && STRATEGY_BY_ID[id] && !ids.includes(id)) ids.push(id);
  }
  return ids.length ? ids.slice(0, 3) : ['flow', 'convert', 'longtail'];
}

export function normalizePlatformKey(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (raw === 'tmall' || raw.includes('淘宝') || raw.includes('天猫')) return 'taobao';
  if (raw === 'pinduoduo' || raw.includes('拼多多')) return 'pdd';
  if (raw === 'doudian' || raw.includes('抖音') || raw.includes('抖店')) return 'douyin';
  if (raw === 'jingdong' || raw.includes('京东')) return 'jd';
  if (raw.includes('temu')) return 'temu';
  if (raw.includes('amazon') || raw.includes('亚马逊')) return 'amazon';
  return PLATFORMS[raw] ? raw : null;
}

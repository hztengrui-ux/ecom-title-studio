// 规则版本：改默认值或迁移逻辑时递增，store 会据此升级旧数据。
export const RULES_VERSION = 2;

// 字段元信息：UI 的输入范围、推荐值与解释共用这一份，避免界面与校验脱节。
export const RULE_GUIDE = Object.freeze({
  titleZh: {
    label: '中文标题',
    unit: '字',
    min: 4,
    max: 30,
    recommendedMin: 12,
    recommendedMax: 30,
    note: '12 字是底线：少于这个长度往往只剩品类词，搜索匹配度低',
  },
  titleEn: {
    label: '英文标题',
    unit: '字符',
    min: 10,
    max: 200,
    recommendedMin: 40,
    recommendedMax: 200,
    note: '40 字符约等于中文 12–15 字的信息量，与中文规则配套',
  },
  description: {
    label: '商品描述',
    unit: '字',
    min: 10,
    max: 500,
    recommendedMin: 40,
    recommendedMax: 120,
    note: '40 字起即可；简单品类不必硬凑到 60 字，堆砌反而稀释内容',
  },
  keywords: {
    label: '核心关键词',
    unit: '个',
    min: 1,
    max: 12,
    recommendedMin: 3,
    recommendedMax: 8,
    note: '少于 3 个基本没有覆盖效果；8 个以内更聚焦',
  },
});

export const DEFAULT_RULES = Object.freeze({
  titleMinZh: 12,
  titleMaxZh: 30,
  titleMinEn: 40,
  titleMaxEn: 200,
  descriptionMin: 40,
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
});

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanText(value, limit) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function cleanList(value, limit, itemLength) {
  const source = Array.isArray(value)
    ? value
    : String(value || '').split(/[\n,，、;；]+/);
  const seen = new Set();
  const result = [];
  for (const item of source) {
    const text = String(item || '').trim().slice(0, itemLength);
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function pairRange(source, lo, hi, fallbackMin, fallbackMax) {
  let min = clampInt(source[0], lo, hi, fallbackMin);
  let max = clampInt(source[1], lo, hi, fallbackMax);
  if (min > max) [min, max] = [max, min];
  // 下限必须严格小于上限，至少留 1 个单位的空间，否则区间失去意义。
  if (min === max) {
    if (min > lo) min -= 1;
    else max += 1;
  }
  return [min, max];
}

export function normalizeRules(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const [titleMinZh, titleMaxZh] = pairRange(
    [source.titleMinZh, source.titleMaxZh],
    RULE_GUIDE.titleZh.min,
    RULE_GUIDE.titleZh.max,
    DEFAULT_RULES.titleMinZh,
    DEFAULT_RULES.titleMaxZh,
  );
  const [titleMinEn, titleMaxEn] = pairRange(
    [source.titleMinEn, source.titleMaxEn],
    RULE_GUIDE.titleEn.min,
    RULE_GUIDE.titleEn.max,
    DEFAULT_RULES.titleMinEn,
    DEFAULT_RULES.titleMaxEn,
  );
  const [descriptionMin, descriptionMax] = pairRange(
    [source.descriptionMin, source.descriptionMax],
    RULE_GUIDE.description.min,
    RULE_GUIDE.description.max,
    DEFAULT_RULES.descriptionMin,
    DEFAULT_RULES.descriptionMax,
  );
  const [keywordMin, keywordMax] = pairRange(
    [source.keywordMin, source.keywordMax],
    RULE_GUIDE.keywords.min,
    RULE_GUIDE.keywords.max,
    DEFAULT_RULES.keywordMin,
    DEFAULT_RULES.keywordMax,
  );

  return {
    rulesVersion: RULES_VERSION,
    titleMinZh,
    titleMaxZh,
    titleMinEn,
    titleMaxEn,
    descriptionMin,
    descriptionMax,
    keywordMin,
    keywordMax,
    mustInclude: cleanList(source.mustInclude, 20, 24),
    bannedWords: cleanList(source.bannedWords, 80, 24),
    keywordCombos: cleanList(source.keywordCombos, 20, 80),
    assetMode: source.assetMode !== false,
    targetCategory: ['generic', 'apparel', 'home', 'drinkware', 'stationery', 'custom'].includes(
      source.targetCategory,
    )
      ? source.targetCategory
      : DEFAULT_RULES.targetCategory,
    targetCategoryLabel: cleanText(source.targetCategoryLabel, 40),
    titlePrefix: cleanText(source.titlePrefix, 24),
    titleSuffix: cleanText(source.titleSuffix, 24),
    targetLength: clampInt(source.targetLength, 0, 200, DEFAULT_RULES.targetLength),
    language: ['auto', 'zh', 'en'].includes(source.language)
      ? source.language
      : DEFAULT_RULES.language,
    customPrompt: cleanText(source.customPrompt, 1200),
    imageMaxEdge: clampInt(source.imageMaxEdge, 320, 4096, DEFAULT_RULES.imageMaxEdge),
    imageResizeMode: ['width', 'longest'].includes(source.imageResizeMode)
      ? source.imageResizeMode
      : DEFAULT_RULES.imageResizeMode,
    outputDir: cleanText(source.outputDir, 500),
    saveOriginalImages: source.saveOriginalImages !== false,
    concurrency: clampInt(source.concurrency, 1, 20, DEFAULT_RULES.concurrency),
    concurrencyMode: ['auto', 'manual'].includes(source.concurrencyMode)
      ? source.concurrencyMode
      : DEFAULT_RULES.concurrencyMode,
  };
}

/**
 * 把旧版本保存的规则升级到当前版本。
 * v1 → v2：描述下限 60 只会让人为凑字，默认下调到 40；用户改过的区间保持不动。
 */
export function migrateRules(input) {
  const source = input && typeof input === 'object' ? { ...input } : {};
  const version = Number(source.rulesVersion) || 1;
  if (version < 2 && source.descriptionMin === 60 && source.descriptionMax === 120) {
    source.descriptionMin = DEFAULT_RULES.descriptionMin;
  }
  source.rulesVersion = RULES_VERSION;
  return source;
}

import {
  PLATFORMS,
  STRATEGIES,
  STRATEGY_BY_ID,
  normalizePlatformKey,
  resolvePlatformIds,
  resolveStrategyIds,
} from './platforms.mjs';
import {
  detectCustomWords,
  detectForbidden,
  displayWidth,
  normalizeTitle,
  scoreTitle,
  titleKey,
  truncateDescription,
} from './title.mjs';
import { normalizeRules } from './rules.mjs';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function text(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function list(value, limit = 8) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
        if (item && typeof item === 'object') {
          return text(item.name || item.label || item.value || item.text || item.point || '');
        }
        return '';
      })
      .filter(Boolean)
      .slice(0, limit);
  }
  if (typeof value === 'string') {
    return value
      .split(/[、,，;；/|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, limit);
  }
  return [];
}

function splitKeywords(value) {
  const result = { core: [], long_tail: [], emotion: [] };
  if (!value || typeof value !== 'object') return result;
  result.core = list(value.core || value.main || value.primary, 8);
  result.long_tail = list(value.long_tail || value.longTail || value.longtail || value.secondary, 8);
  result.emotion = list(value.emotion || value.emotional || value.style, 8);
  return result;
}

const ASSET_EN_PATTERNS = [
  /\bfor\s+(?:the\s+)?(?:living room|bedroom|nursery|kids room|kitchen|bathroom|dining room|office|home office)\b/gi,
  /\b(?:home|wall|room|interior)\s*(?:decor|decoration|art|ornament)\b/gi,
  /\b(?:living room|bedroom|nursery|kids room|kitchen|bathroom|dining room|office|home office)\b/gi,
  /\b(?:poster|canvas|mug|cup|pillow|cushion|blanket|towel|t-shirt|tee|hoodie|sweatshirt|apparel|clothing|garment)\b/gi,
  /\b(?:desk|table|sofa|nightstand|headboard|shelf|decor|decoration|wall|home|room|interior|house)\b/gi,
];

const ASSET_ZH_PATTERN =
  /(?:家居装饰|家居|家具|客厅|卧室|儿童房|厨房|卫生间|浴室|餐厅|办公室|书房|办公桌|书桌|餐桌|床头柜|床头|沙发|墙面装饰|墙饰|墙面|装饰画|海报|画布|杯子|马克杯|抱枕|靠垫|毛毯|毛巾|T恤|卫衣|毛衣|服装|服饰)/g;

function removeFixedAffixes(value, prefix, suffix) {
  const pre = String(prefix || '').trim();
  const suf = String(suffix || '').trim();
  let core = String(value || '').trim();
  if (pre && core.toLowerCase().startsWith(pre.toLowerCase())) {
    core = core.slice(pre.length).replace(/^[\s,，、;；:：\-–—]+/u, '');
  }
  if (suf && core.toLowerCase().endsWith(suf.toLowerCase())) {
    core = core.slice(0, -suf.length).replace(/[\s,，、;；:：\-–—]+$/u, '');
  }
  return core;
}

function composeFixedTitle(prefix, value, suffix, effective) {
  const pre = String(prefix || '').trim();
  const suf = String(suffix || '').trim();
  const core = removeFixedAffixes(value, pre, suf);

  const prefixChars = pre ? displayWidth(pre).chars : 0;
  const suffixChars = suf ? displayWidth(suf).chars : 0;
  const separatorChars =
    (pre && (core || suf) ? 1 : 0) + (core && suf ? 1 : 0);
  const available = Math.max(
    0,
    Number(effective.maxChars || 0) - prefixChars - suffixChars - separatorChars,
  );
  const middle = core && available > 0
    ? normalizeTitle(core, { ...effective, maxChars: available })
    : '';

  let title = pre;
  if (middle) title += (pre ? ' ' : '') + middle;
  if (suf) {
    const noSpace = /^[，,。.!！?？;；:：、]/u.test(suf);
    title += (title && !noSpace ? ' ' : '') + suf;
  }
  return title.replace(/\s{2,}/g, ' ').trim();
}

function stripGenericAssetWords(value) {
  return String(value || '')
    .replace(/通用|素材/g, ' ')
    .replace(/\b(?:generic|asset)\b/gi, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,，、;；:：\-–—]+|[\s,，、;；:：\-–—]+$/g, '')
    .trim();
}

function sanitizeAssetText(value) {
  let text = String(value || '');
  if (!text) return '';
  for (const pattern of ASSET_EN_PATTERNS) text = text.replace(pattern, ' ');
  text = text.replace(ASSET_ZH_PATTERN, ' ');
  return text
    .replace(/\s*[,，、;；:：]\s*(?=[,，、;；:：]|$)/g, '')
    .replace(/\bfor\s*$/i, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/适合\s*$/g, '')
    .replace(/^[\s,，、;；:：\-–—]+|[\s,，、;；:：\-–—]+$/g, '')
    .trim();
}

function sanitizeKeywordGroup(group) {
  return {
    core: group.core.map(sanitizeAssetText).filter(Boolean),
    long_tail: group.long_tail.map(sanitizeAssetText).filter(Boolean),
    emotion: group.emotion.map(sanitizeAssetText).filter(Boolean),
  };
}

function platformRule(platform, rules) {
  const chinese = platform.lang === 'zh';
  const requestedMin = chinese ? rules.titleMinZh : rules.titleMinEn;
  const requestedMax = chinese ? rules.titleMaxZh : rules.titleMaxEn;
  const targetMax = Number(rules.targetLength) > 0 ? Number(rules.targetLength) : platform.maxChars;
  const maxChars = Math.max(4, Math.min(platform.maxChars, requestedMax, targetMax));
  const minChars = Math.max(0, Math.min(requestedMin, maxChars));
  return {
    effective: {
      ...platform,
      maxChars,
      maxBytes: platform.maxBytes ? Math.min(platform.maxBytes, 60) : null,
    },
    minChars,
  };
}

function uniqueWarnings(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.label}:${item.term}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function attributesOf(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        const [name, ...rest] = item.split(/[：:]/);
        return { name: name.trim(), value: rest.join(':').trim() };
      }
      if (item && typeof item === 'object') {
        return {
          name: text(item.name || item.key || item.label),
          value: text(item.value || item.val || item.content),
        };
      }
      return null;
    })
    .filter((item) => item && (item.name || item.value))
    .slice(0, 10);
}

/**
 * 从模型输出中提取第一个完整 JSON 对象（容忍 ```json 代码块与前后解释文字）。
 */
export function parseModelJson(input) {
  let source = String(input || '').trim();
  if (!source) throw new Error('模型返回为空');
  source = source
    .replace(/^```(?:json|JSON)?\s*/u, '')
    .replace(/```\s*$/u, '')
    .trim();

  const startIndex = source.search(/[{[]/u);
  if (startIndex < 0) throw new Error('模型返回中没有 JSON');

  const opener = source[startIndex];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        const candidate = source.slice(startIndex, index + 1);
        try {
          return JSON.parse(candidate);
        } catch (error) {
          const repaired = candidate.replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(repaired);
        }
      }
    }
  }
  throw new Error('模型返回的 JSON 不完整');
}

function strategyIdOf(value, index, fallbackIds) {
  const raw = text(value).toLowerCase();
  if (!raw) return fallbackIds[index] || fallbackIds[0] || 'flow';
  if (STRATEGY_BY_ID[raw]) return raw;
  for (const strategy of STRATEGIES) {
    if (raw.includes(strategy.label) || raw.includes(strategy.id)) return strategy.id;
  }
  if (/long[\s-]?tail|长尾/u.test(raw)) return 'longtail';
  if (/convert|conversion|转化/u.test(raw)) return 'convert';
  if (/brand|品牌/u.test(raw)) return 'brand';
  if (/flow|traffic|流量/u.test(raw)) return 'flow';
  return fallbackIds[index] || fallbackIds[0] || 'flow';
}

function titleCandidates(raw) {
  const source = raw?.titles ?? raw?.title_list ?? raw?.results;
  if (Array.isArray(source)) return source;
  if (source && typeof source === 'object') {
    const rows = [];
    for (const [platform, value] of Object.entries(source)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          rows.push(
            typeof item === 'string'
              ? { platform, text: item }
              : { platform, ...(item || {}) },
          );
        }
      } else if (typeof value === 'string') {
        rows.push({ platform, text: value });
      }
    }
    return rows;
  }
  return [];
}

/**
 * 把模型原始输出归一化为前端可直接渲染的结果。
 */
export function normalizeResult(raw, options = {}) {
  const object = raw && typeof raw === 'object' ? raw : {};
  const body = object.data && typeof object.data === 'object' && !object.product
    ? object.data
    : object;
  const platformIds = resolvePlatformIds(options.platforms);
  const strategyIds = resolveStrategyIds(options.strategies);
  const rules = normalizeRules(options.rules || options);
  const targetCategory = rules.targetCategory || 'generic';
  const categoryLabels = {
    generic: '通用素材',
    apparel: '服装 / 印花',
    home: '家居 / 装饰画',
    drinkware: '杯具 / 餐具',
    stationery: '文具 / 贴纸',
    custom: rules.targetCategoryLabel || '自定义类目',
  };
  const targetCategoryLabel = categoryLabels[targetCategory] || '通用素材';
  const genericMode = rules.assetMode !== false && targetCategory === 'generic';

  const productRaw = body.product && typeof body.product === 'object' ? body.product : body;
  const rawProductName = text(productRaw.name || productRaw.title || productRaw.product_name, '未命名商品');
  const rawProductCategory = text(productRaw.category || productRaw.category_name, '');
  const rawProductSummary = text(productRaw.summary || productRaw.description || productRaw.desc, '');
  const product = {
    name:
      stripGenericAssetWords(
        genericMode ? sanitizeAssetText(rawProductName) || '图案' : rawProductName,
      ) || '图案',
    category:
      targetCategory === 'generic'
        ? (genericMode ? '通用素材' : rawProductCategory)
        : targetCategoryLabel,
    categoryPath:
      targetCategory === 'generic'
        ? (genericMode ? [] : list(productRaw.category_path || productRaw.categoryPath, 4))
        : [targetCategoryLabel],
    summary: stripGenericAssetWords(
      genericMode ? sanitizeAssetText(rawProductSummary) : rawProductSummary,
    ),
    attributes: attributesOf(productRaw.attributes || productRaw.attrs),
    audience: genericMode ? [] : list(productRaw.audience || productRaw.target_audience, 6),
    scenes: genericMode ? [] : list(productRaw.scenes || productRaw.usage_scenes || productRaw.use_cases, 6),
    visibleText: list(productRaw.visible_text || productRaw.visibleText || productRaw.ocr_text, 8),
    confidence: (() => {
      const value = Number(productRaw.confidence);
      if (!Number.isFinite(value)) return null;
      return clamp(value > 1 ? value / 100 : value, 0, 1);
    })(),
  };

  const rawSellingPoints = list(body.selling_points || body.sellingPoints || body.selling_point, 5);
  const sellingPoints = (genericMode
    ? rawSellingPoints.map(sanitizeAssetText)
    : rawSellingPoints
  )
    .map(stripGenericAssetWords)
    .filter(Boolean);
  const rawKeywords = splitKeywords(body.keywords);
  const rawKeywordsEn = splitKeywords(body.keywords_en || body.keywordsEn);
  const cleanKeywordGroup = (group) => ({
    core: group.core.map(stripGenericAssetWords).filter(Boolean),
    long_tail: group.long_tail.map(stripGenericAssetWords).filter(Boolean),
    emotion: group.emotion.map(stripGenericAssetWords).filter(Boolean),
  });
  const keywords = cleanKeywordGroup(
    genericMode ? sanitizeKeywordGroup(rawKeywords) : rawKeywords,
  );
  const keywordsEn = cleanKeywordGroup(
    genericMode ? sanitizeKeywordGroup(rawKeywordsEn) : rawKeywordsEn,
  );

  const rows = titleCandidates(body);
  const normalized = [];
  const seen = new Set();

  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;
    const platformId = normalizePlatformKey(row.platform || row.site || row.channel);
    if (!platformId || !platformIds.includes(platformId)) return;
    const platform = PLATFORMS[platformId];
    const { effective, minChars } = platformRule(platform, rules);
    const strategyId = strategyIdOf(row.strategy || row.type || row.angle, index, strategyIds);
    const value = text(row.text || row.title || row.value || row.content);
    if (!value) return;
    const prefix = String(rules.titlePrefix || '').trim();
    const suffix = String(rules.titleSuffix || '').trim();
    const rawCore = removeFixedAffixes(value, prefix, suffix);
    const core = stripGenericAssetWords(
      genericMode ? sanitizeAssetText(rawCore) : rawCore,
    );
    if (!core && !prefix && !suffix) return;
    const title = prefix || suffix
      ? composeFixedTitle(prefix, core, suffix, effective)
      : normalizeTitle(core, effective);
    if (!title) return;
    const rawTranslation = text(
      row.translation || row.title_zh || row.title_en || row.zh || row.en,
    );
    const translation = stripGenericAssetWords(
      genericMode ? sanitizeAssetText(rawTranslation) : rawTranslation,
    );
    const dedupe = `${platformId}:${titleKey(title)}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);

    const rawTitleKeywords = list(row.keywords, 6);
    const titleKeywords = (genericMode
      ? rawTitleKeywords.map(sanitizeAssetText)
      : rawTitleKeywords
    )
      .map(stripGenericAssetWords)
      .filter(Boolean);
    const keywordPoolRaw = platform.lang === 'en'
      ? (keywordsEn.core.length ? keywordsEn.core : titleKeywords)
      : (keywords.core.length ? keywords.core : titleKeywords);
    const keywordPool = (genericMode
      ? keywordPoolRaw.map(sanitizeAssetText)
      : keywordPoolRaw
    )
      .map(stripGenericAssetWords)
      .filter(Boolean);
    const warnings = uniqueWarnings([
      ...detectForbidden(title),
      ...detectCustomWords(title, rules.bannedWords),
    ]);
    const missingRequired =
      platform.lang === 'zh'
        ? rules.mustInclude.filter((word) => !title.includes(word))
        : [];
    const score = scoreTitle(title, effective, keywordPool, warnings);
    const width = displayWidth(title);

    normalized.push({
      platform: platformId,
      strategy: strategyId,
      strategyLabel: STRATEGY_BY_ID[strategyId]?.label || '标题',
      text: title,
      translation,
      chars: width.chars,
      bytes: platform.lang === 'zh' ? width.bytes : null,
      limit: effective.maxChars,
      minChars,
      lengthOk: width.chars >= minChars,
      byteLimit: effective.maxBytes,
      keywords: titleKeywords,
      reason: text(row.reason || row.explanation || row.why),
      warnings: warnings.map((hit) => hit.term),
      warningDetails: warnings,
      missingRequired,
      score,
    });
  });

  // 模型偶尔只给部分平台，按平台补齐顺序并过滤未选策略。
  const resultTitles = [];
  for (const platformId of platformIds) {
    const all = normalized.filter((item) => item.platform === platformId);
    const selected = all.filter((item) => strategyIds.includes(item.strategy));
    const pool = selected.length ? selected : all.slice(0, strategyIds.length || 3);
    const ordered = [...pool].sort(
      (a, b) => strategyIds.indexOf(a.strategy) - strategyIds.indexOf(b.strategy),
    );
    resultTitles.push(...ordered);
  }

  // 同一策略去重，保证每个平台不出现两条完全同义的标题。
  const platformStrategySeen = new Set();

  const finalTitles = resultTitles.map((item) => {
    let strategy = item.strategy;
    const key = `${item.platform}:${strategy}`;
    if (platformStrategySeen.has(key) && strategyIds.length) {
      strategy = strategyIds.find((id) => !platformStrategySeen.has(`${item.platform}:${id}`)) || strategy;
    }
    platformStrategySeen.add(`${item.platform}:${strategy}`);
    return {
      ...item,
      strategy,
      strategyLabel: STRATEGY_BY_ID[strategy]?.label || item.strategyLabel,
    };
  });

  const forbiddenMap = new Map();
  for (const title of finalTitles) {
    for (const detail of title.warningDetails || []) {
      if (!forbiddenMap.has(detail.term)) {
        forbiddenMap.set(detail.term, { term: detail.term, label: detail.label || '标题检测' });
      }
    }
  }
  const descriptionValue =
    body.description ??
    body.listing_description ??
    body.listingDescription ??
    productRaw.listing_description ??
    productRaw.listingDescription ??
    productRaw.description ??
    '';
  const rawDescription = descriptionValue && typeof descriptionValue === 'object'
    ? text(descriptionValue.text || descriptionValue.content || descriptionValue.value)
    : text(descriptionValue);
  const descriptionSource = stripGenericAssetWords(
    genericMode ? sanitizeAssetText(rawDescription) : rawDescription,
  );
  const descriptionText = truncateDescription(descriptionSource, rules.descriptionMax);
  const descriptionChars = displayWidth(descriptionText).chars;
  const descriptionWarnings = uniqueWarnings([
    ...detectForbidden(descriptionText),
    ...detectCustomWords(descriptionText, rules.bannedWords),
  ]);
  const description = {
    text: descriptionText,
    chars: descriptionChars,
    min: rules.descriptionMin,
    max: rules.descriptionMax,
    ok: descriptionChars >= rules.descriptionMin && descriptionChars <= rules.descriptionMax,
    warnings: descriptionWarnings.map((hit) => hit.term),
  };
  for (const detail of descriptionWarnings) {
    if (!forbiddenMap.has(detail.term)) {
      forbiddenMap.set(detail.term, { term: detail.term, label: `${detail.label || '风险词'}（描述）` });
    }
  }

  const rawCompliance = body.compliance && typeof body.compliance === 'object' ? body.compliance : {};
  const rawForbidden = rawCompliance.forbidden || rawCompliance.risk_words || [];
  for (const item of Array.isArray(rawForbidden) ? rawForbidden : [rawForbidden]) {
    const term = text(typeof item === 'string' ? item : item?.term || item?.word);
    if (term && !forbiddenMap.has(term)) {
      forbiddenMap.set(term, {
        term,
        label: text(typeof item === 'object' ? item?.label || item?.type : '', '模型提示'),
      });
    }
  }
  const notes = list(rawCompliance.notes || rawCompliance.warnings, 8);
  if (forbiddenMap.size && !notes.some((note) => /极限词|绝对化|违禁|风险/u.test(note))) {
    notes.unshift('标题或描述中检测到需谨慎使用的表述，上架前请按平台规则复核。');
  }
  if (finalTitles.some((title) => title.missingRequired.length)) {
    notes.push(
      `部分标题未包含必含词：${[...new Set(finalTitles.flatMap((title) => title.missingRequired))].join('、')}`,
    );
  }

  const qualityRaw = body.image_quality || body.imageQuality || {};
  const imageQuality = {
    score: (() => {
      const value = Number(qualityRaw.score);
      return Number.isFinite(value) ? clamp(Math.round(value), 0, 100) : null;
    })(),
    issues: list(qualityRaw.issues || qualityRaw.suggestions, 5),
  };

  // 综合分取每个平台得分最高的两条，避免一条偏弱的长尾标题拖低整体观感。
  const topScores = platformIds.flatMap((id) =>
    finalTitles
      .filter((item) => item.platform === id)
      .map((item) => item.score.overall)
      .sort((a, b) => b - a)
      .slice(0, 2),
  );
  const overallScore = topScores.length
    ? Math.round(topScores.reduce((sum, value) => sum + value, 0) / topScores.length)
    : 0;

  const platformCounts = Object.fromEntries(
    platformIds.map((id) => [id, finalTitles.filter((item) => item.platform === id).length]),
  );

  return {
    product,
    description,
    sellingPoints,
    keywords,
    keywordsEn,
    titles: finalTitles,
    rules,
    compliance: {
      forbidden: [...forbiddenMap.values()],
      notes,
      hasIssues: forbiddenMap.size > 0,
    },
    imageQuality,
    overallScore,
    titleCount: finalTitles.length,
    platformCounts,
    meta: {
      model: text(options.model, ''),
      demo: Boolean(options.demo),
      demoNote: text(options.demoNote, ''),
      demoSample: text(options.demoSample, ''),
      elapsedMs: Number(options.elapsedMs) || 0,
      usage: options.usage || null,
      generatedAt: new Date().toISOString(),
    },
  };
}

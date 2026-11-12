const TRAILING_PUNCTUATION = /[，,、；;：:·|｜/\\\-—–\s]+$/u;
const LEADING_PUNCTUATION = /^[，,、；;：:·|｜/\\\-—–\s]+/u;
const DELIMITERS = /[，,、；;：:·|｜/\s]/gu;

export const FORBIDDEN_RULES = Object.freeze([
  {
    label: '绝对化用语',
    pattern:
      /最好|最佳|最强|最低价|最高级|顶级|极致|国家级|世界级|绝对|永久|万能|唯一|独家|史无前例|全网最低|销量冠军|排名第一|销量第一|第一品牌|零风险|包治|根治/gu,
  },
  {
    label: '功效保证',
    pattern: /100%\s*(?:有效|安全|纯天然|无添加|治愈|防|去|瘦|白)/gu,
  },
]);

export function charLength(value) {
  return Array.from(String(value || '')).length;
}

/** 粗估 GBK 字节数：ASCII 1 字节，其余 2 字节。 */
export function gbkBytes(value) {
  let bytes = 0;
  for (const char of String(value || '')) {
    bytes += char.codePointAt(0) <= 0x7f ? 1 : 2;
  }
  return bytes;
}

export function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripWrapping(value) {
  return String(value || '')
    .replace(/^(?:产品)?标题\s*\d*\s*[：:]\s*/i, '')
    .replace(/^title\s*\d*\s*[：:]\s*/i, '')
    .replace(/^[\s"'“”‘’「」『』【】[\]]+/u, '')
    .replace(/[\s"'“”‘’「」『』【】[\]]+$/u, '')
    .trim();
}

/**
 * 将模型标题收敛到平台上限。优先在分隔符处截断，避免把词切碎。
 */
export function truncateTitle(value, platform) {
  let text = collapseWhitespace(stripWrapping(value));
  const maxChars = platform?.maxChars || 30;
  if (charLength(text) <= maxChars && (!platform?.maxBytes || gbkBytes(text) <= platform.maxBytes)) {
    return text.replace(TRAILING_PUNCTUATION, '');
  }

  let chars = Array.from(text);
  if (chars.length > maxChars) {
    const safeStart = Math.floor(maxChars * 0.55);
    const window = chars.slice(safeStart, maxChars).join('');
    const matches = [...window.matchAll(DELIMITERS)];
    let cutIndex = maxChars;
    if (matches.length) {
      const last = matches[matches.length - 1];
      cutIndex = safeStart + (last.index || 0);
    }
    chars = chars.slice(0, cutIndex);
  }

  if (platform?.maxBytes) {
    while (chars.length && gbkBytes(chars.join('')) > platform.maxBytes) {
      chars.pop();
    }
  }

  text = chars.join('').replace(TRAILING_PUNCTUATION, '').replace(LEADING_PUNCTUATION, '');
  return text.trim();
}

export function normalizeTitle(value, platform) {
  const text = truncateTitle(value, platform);
  return text.replace(/\s{2,}/g, ' ').trim();
}

export function titleKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s，,、；;：:·|｜/\\\-—–"'“”‘’「」『』【】[\]]/g, '');
}

/**
 * 检测常见广告法风险词。返回去重后的命中项与位置。
 */
export function detectForbidden(value) {
  const text = String(value || '');
  const hits = [];
  const seen = new Set();
  for (const rule of FORBIDDEN_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    for (const match of text.matchAll(regex)) {
      const term = match[0];
      const key = `${rule.label}:${term}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ term, label: rule.label, index: match.index ?? 0 });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

/** 检测用户在「生成规则」里自定义的禁用词。 */
export function detectCustomWords(value, words = []) {
  const text = String(value || '');
  const lower = text.toLowerCase();
  const hits = [];
  for (const word of Array.isArray(words) ? words : []) {
    const term = String(word || '').trim();
    if (!term) continue;
    const index = lower.indexOf(term.toLowerCase());
    if (index >= 0) hits.push({ term, label: '自定义禁用词', index });
  }
  return hits.sort((a, b) => a.index - b.index);
}

export function truncateDescription(value, maxChars = 120) {
  let text = collapseWhitespace(value);
  const limit = Math.max(10, Number(maxChars) || 120);
  if (charLength(text) <= limit) return text;
  const chars = Array.from(text);
  const window = chars.slice(Math.floor(limit * 0.55), limit).join('');
  const matches = [...window.matchAll(/[。！？；.!?;]/gu)];
  let cut = limit;
  if (matches.length) {
    const last = matches[matches.length - 1];
    cut = Math.floor(limit * 0.55) + (last.index || 0) + 1;
  }
  return chars.slice(0, cut).join('').trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function keywordCovered(text, keyword) {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  if (lowerText.includes(lowerKeyword)) return true;

  const parts = lowerKeyword.split(/[\s/、,，·|]+/u).filter(Boolean);
  if (parts.length > 1 && parts.every((part) => lowerText.includes(part))) return true;

  // 中文没有天然词边界：四字以上的词允许用「头两字 + 尾两字」判断覆盖。
  const hanChars = Array.from(lowerKeyword).filter((char) => /[\u3400-\u9fff]/u.test(char));
  if (hanChars.length >= 4) {
    const head = hanChars.slice(0, 2).join('');
    const tail = hanChars.slice(-2).join('');
    if (lowerText.includes(head) && lowerText.includes(tail)) return true;
  }
  return false;
}

/**
 * 为单条标题打分：关键词覆盖 45%、可读性 35%、合规 20%。
 */
export function scoreTitle(title, platform, keywords = [], forbiddenHits = []) {
  const text = String(title || '');
  const core = (Array.isArray(keywords) ? keywords : [])
    .map((keyword) => String(keyword || '').trim())
    .filter(Boolean);

  const matched = core.filter((keyword) => keywordCovered(text, keyword));
  const coverage = core.length ? Math.min(1, matched.length / Math.min(2, core.length)) : 0.55;

  const length = charLength(text);
  const target = (platform?.maxChars || 30) * 0.8;
  const lengthFit = clamp(1 - Math.abs(length - target) / ((platform?.maxChars || 30) * 0.65), 0, 1);
  const hasStructure = /[，,、·|｜\s]/u.test(text) ? 1 : 0.55;
  const readability = 100 * (
    0.58 * lengthFit +
    0.22 * hasStructure +
    0.2 * clamp(length / 12, 0, 1)
  );
  const compliance = Math.max(0, 100 - 28 * (forbiddenHits?.length || 0));
  const overall = Math.round(0.45 * coverage * 100 + 0.35 * readability + 0.2 * compliance);

  return {
    overall,
    keyword: Math.round(coverage * 100),
    readability: Math.round(readability),
    compliance: Math.round(compliance),
    matchedKeywords: matched,
  };
}

export function displayWidth(value) {
  const length = charLength(value);
  return { chars: length, bytes: gbkBytes(value) };
}

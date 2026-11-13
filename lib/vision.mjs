import {
  PLATFORMS,
  STRATEGY_BY_ID,
  resolvePlatformIds,
  resolveStrategyIds,
} from './platforms.mjs';
import { normalizeRules } from './rules.mjs';
import { parseModelJson } from './normalize.mjs';

export const SYSTEM_PROMPT = `你是一名资深电商视觉运营与标题优化师，长期负责淘宝/天猫、拼多多、抖店、京东、TEMU 与 Amazon 的商品上架。你能从一张商品图中判断品类、材质、结构、风格、使用场景与目标人群，并写出既能被搜索到、又能让人点击的标题。

铁律：
1. 只写图片中能够确认的信息，以及用户补充的信息；不确定就不要写。
2. 不虚构品牌、认证、专利、销量、价格、折扣、功效、医疗作用或绝对化承诺。
3. 标题必须完整可读，像真人运营写的，不堆砌关键词，不写「标题：」或引号。
4. 严格服从每个平台的字符上限，宁短勿超。
5. 只输出一个合法 JSON 对象，不要 Markdown、代码块或解释文字。`;

const OUTPUT_SCHEMA = `{
  "product": {
    "name": "商品名，12-20字",
    "category": "一级类目 / 二级类目",
    "category_path": ["一级类目", "二级类目", "三级类目"],
    "summary": "1-2句画面描述，说明主体、材质、颜色、结构、场景",
    "attributes": [{"name": "材质", "value": "陶瓷"}],
    "audience": ["目标人群"],
    "scenes": ["使用场景"],
    "visible_text": ["图片中可辨认的文字，没有就空数组"],
    "confidence": 0.9
  },
  "description": "一段中文商品描述，包含材质、结构、场景与真实卖点，控制在用户设定的字数范围内",
  "selling_points": ["最多4条，具体、可验证"],
  "keywords": {
    "core": ["3-6个中文核心搜索词"],
    "long_tail": ["3-6个中文长尾词"],
    "emotion": ["2-4个中文情绪/风格词"]
  },
  "keywords_en": {
    "core": ["3-6 English core keywords"],
    "long_tail": ["3-6 English long-tail keywords"],
    "emotion": ["2-4 English style words"]
  },
  "titles": [
    {
      "platform": "taobao",
      "strategy": "流量型",
      "text": "标题正文",
      "translation": "中文标题给简洁英文对照；英文标题给准确中文对照",
      "keywords": ["这条标题覆盖的关键词"],
      "reason": "一句话说明切入角度，不超过30字"
    }
  ],
  "compliance": {
    "forbidden": ["标题中实际出现的风险词，没有就空数组"],
    "notes": ["上架前需要注意的合规点"]
  },
  "image_quality": {
    "score": 88,
    "issues": ["最多2条拍摄建议"]
  }
}`;

function safeText(value, limit) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function buildPrompt({ brief = {}, platforms, strategies, rules: rulesInput, titlesPerPlatform = 1 }) {
  const platformIds = resolvePlatformIds(platforms);
  const strategyIds = resolveStrategyIds(strategies);
  // 每个平台生成几条标题：默认 1 条（省 token、省审核），需要对比时由调用方显式传 2–3。
  const perPlatform = Math.max(1, Math.min(Number(titlesPerPlatform) || 1, strategyIds.length || 1));
  const totalTitles = platformIds.length * perPlatform;
  const rules = normalizeRules(rulesInput || {});
  const targetCategory = rules.targetCategory || 'generic';
  const targetCategoryLabels = {
    apparel: '服装 / 印花',
    home: '家居 / 装饰画',
    drinkware: '杯具 / 餐具',
    stationery: '文具 / 贴纸',
    custom: rules.targetCategoryLabel || '自定义类目',
  };
  const targetCategoryLabel = targetCategoryLabels[targetCategory] || '通用素材';
  const assetMode = rules.assetMode !== false;
  const genericMode = assetMode && targetCategory === 'generic';

  const platformLines = platformIds.map((id) => {
    const platform = PLATFORMS[id];
    const unit = platform.lang === 'en' ? '字符' : '字';
    const byteHint = platform.maxBytes ? `，约 ${platform.maxBytes} 字节` : '';
    return `- ${platform.name}（platform 字段填 "${id}"）：${platform.lang === 'en' ? '英文' : '中文'}，每条 ≤ ${platform.maxChars} ${unit}${byteHint}；语气：${platform.tone}。`;
  });

  const strategyLines = strategyIds.map((id) => {
    const strategy = STRATEGY_BY_ID[id];
    return `- ${strategy.label}（strategy 字段填 "${strategy.label}"）：${strategy.instruction}`;
  });

  const briefLines = [
    brief.category
      ? `${assetMode ? '素材主题' : '品类'}：${safeText(brief.category, 40)}`
      : '',
    brief.brand ? `品牌：${safeText(brief.brand, 30)}` : '',
    brief.sellingPoints
      ? `${assetMode ? '已知画面元素' : '已知卖点'}：${safeText(brief.sellingPoints, 300)}`
      : '',
    brief.audience
      ? `${assetMode ? '适用素材类型' : '目标人群'}：${safeText(brief.audience, 100)}`
      : '',
  ].filter(Boolean);

  const assetLines = genericMode
    ? [
        '- 这是服装 / 印花 / 图案素材，可能用于多个服装品类；不要把它判断为家居装饰、装饰画、海报、杯子、抱枕等具体行业商品。',
        '- 标题只写画面素材：主体、风格、颜色、构图、图案类型、艺术技法、氛围；不要写行业、品类、房间、用途、人群词。',
        '- 不要写 T恤、卫衣、毛衣、服装、服饰、家居、客厅、卧室、厨房、办公室、墙面、海报、画布等具体品类或用途词。',
        '- 关键词同样只给素材词（主体 + 风格 + 颜色 + 图案类型），不要给行业关键词。',
        '- 描述写画面元素与可印性，不写具体商品用途；涉及面料、尺寸、工艺时提醒按实物确认。',
      ]
    : [];

  const targetedLines = targetCategory === 'apparel'
    ? [
        '- 目标类目是服装 / 印花：这是可用于多个服装品类的图案素材；可写 apparel、print design 等通用词，但不要写 T恤、卫衣、毛衣等具体款式。',
        '- 重点写画面主体、风格、颜色、图案类型与可印性；不要写家居、房间、杯子等其他行业词。',
      ]
    : targetCategory === 'home'
      ? [
          '- 目标类目是家居 / 装饰画：可以围绕 Home Decor、Wall Art、Living Room、Bedroom 等方向写。',
          '- 但仍以画面主体与风格为主，不要写服装、杯具、文具等无关行业词。',
        ]
      : targetCategory === 'drinkware'
        ? [
            '- 目标类目是杯具 / 餐具：可以写 mug、cup、drinkware、tableware 等词。',
            '- 不要写家居房间、服装、文具等无关行业词。',
          ]
        : targetCategory === 'stationery'
          ? [
              '- 目标类目是文具 / 贴纸：可以写 sticker、stationery、paper、journal 等词。',
              '- 不要写家居房间、服装、杯具等无关行业词。',
            ]
          : targetCategory === 'custom'
            ? [
                `- 目标类目是「${targetCategoryLabel}」：围绕这个类目写，不要写其他行业词，也不要虚构参数。`,
              ]
            : [];

  const ruleLines = [
    targetCategory !== 'generic'
      ? `- 目标类目：${targetCategoryLabel}。所有标题与描述围绕这个类目写；不写其他行业词。`
      : '',
    `- 中文标题长度：${rules.titleMinZh}–${rules.titleMaxZh} 字；英文标题长度：${rules.titleMinEn}–${rules.titleMaxEn} 字符。任何情况下都不得超过平台硬上限。`,
    rules.targetLength > 0
      ? `- 目标标题长度约 ${rules.targetLength} 字符；这是软目标，若与平台硬上限冲突，以平台上限为准。`
      : '',
    rules.language === 'zh'
      ? '- 标题语言：中文。即使平台默认英文，也输出中文标题；translation 给英文对照。'
      : rules.language === 'en'
        ? '- 标题语言：英文。即使平台默认中文，也输出英文标题；translation 给中文对照。'
        : '- 标题语言：跟随平台（中文平台中文，英文平台英文）。',
    `- 商品描述：中文，${rules.descriptionMin}–${rules.descriptionMax} 字，必须写清${assetMode ? '画面主体、颜色、构图、风格与可印性' : '材质、结构、使用场景与真实卖点'}，不夸大。`,
    `- 关键词：核心词 ${rules.keywordMin}–${rules.keywordMax} 个；长尾词与风格词各给 2–6 个。`,
    rules.mustInclude.length
      ? `- 必含关键词：${rules.mustInclude.join('、')}。中文标题要优先自然包含；无法自然融入时不要硬塞，交给系统标记。`
      : '',
    rules.keywordCombos.length
      ? `- 关键词组合建议（按平台语气自然调整）：${rules.keywordCombos.join('；')}。`
      : '',
    rules.bannedWords.length
      ? `- 自定义禁用词：${rules.bannedWords.join('、')}。任何标题与描述都不得出现。`
      : '',
    '- 标题、商品名、描述里不要出现「通用」「素材」字样，也不要写 generic / asset。',
    rules.titlePrefix
      ? `- 标题前缀：${rules.titlePrefix}。这是固定文案，正文不要重复；系统会完整保留它，并只压缩中间标题。`
      : '',
    rules.titleSuffix
      ? `- 标题后缀：${rules.titleSuffix}。这是固定文案，正文不要重复；系统会完整保留它，并只压缩中间标题。`
      : '',
    rules.customPrompt
      ? `- 额外要求（不得违反平台规则）：${rules.customPrompt}`
      : '',
  ].filter(Boolean);

  return `${genericMode ? '请分析这张图案/插画素材，并按下面的平台与策略生成素材描述型标题与画面描述。' : targetCategory !== 'generic' ? `请分析这张图案/素材，并按「${targetCategoryLabel}」这个目标类目生成有针对性的标题与描述。` : '请分析这张商品图，并按下面的平台与策略生成可以直接上架的标题与商品描述。'}

【用户补充】
${briefLines.length ? briefLines.join('\n') : '未提供。请完全依据图片判断，不要猜测品牌与参数。'}

【平台与上限】
${platformLines.join('\n')}

【标题策略】
${strategyLines.join('\n')}

${genericMode ? `【素材模式硬约束】\n${assetLines.join('\n')}\n` : ''}
${targetCategory !== 'generic' ? `【目标类目约束】\n${targetedLines.join('\n')}\n` : ''}
【用户的生成约束】
${ruleLines.join('\n')}

【生成规则】
1. ${perPlatform === 1
  ? `每个平台只生成 1 条标题（从下面的策略里挑选最贴合这件商品的一个，strategy 字段填被选中的策略），总共 ${totalTitles} 条；titles 数组每个平台一条。`
  : `每个平台的每个策略各生成 1 条，总共 ${totalTitles} 条；titles 数组要覆盖全部组合。`}
2. ${assetMode ? '中文标题把画面主体与风格词尽量前置，用空格、顿号或竖线分隔意群；英文标题用自然表达，注意大小写与单复数。' : '中文标题把品类核心词尽量前置，用空格、顿号或竖线分隔意群；英文标题用自然表达，注意大小写与单复数。'}每条标题必须同时给 translation：英文标题给准确、简短的中文对照；中文标题给简洁英文对照；只翻译，不扩写，不重复标题前缀/后缀。
3. ${assetMode ? '画面元素优先：主体、颜色、构图、图案类型、艺术技法、氛围，比空泛的「高级感」「绝美」更有用。' : '具体优先：材质、容量、尺寸、结构、使用场景，比「高级感」「绝美」更有用。'}
4. 不写价格、销量、折扣、赠品、运费、店铺名；不写图片中不存在的功能。
5. 禁止极限词与绝对化表述：最好、最佳、第一、顶级、极致、国家级、全网最低、100%有效、永久、万能、唯一、独家、零风险等。
6. 图片里若有水印、促销贴纸、无关文字，不要写进标题；只把与商品本身有关的可辨认文字放进 visible_text。
7. keywords_en 用于英文标题评分，即使只生成中文平台也要给出。
8. 严格按用户设定的标题长度与描述字数输出；宁短勿超，描述要完整成句。
9. 严格返回下面的 JSON 结构，不要输出任何额外文字：
${OUTPUT_SCHEMA}`;
}

export class VisionError extends Error {
  constructor(status, code, message, detail = '') {
    super(message);
    this.name = 'VisionError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function normalizeBaseUrl(value) {
  let url = String(value || '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    throw new VisionError(400, 'BAD_BASE_URL', '接口地址必须以 http:// 或 https:// 开头');
  }
  url = url.replace(/\/+$/g, '');
  url = url.replace(/\/chat\/completions$/i, '');
  return url;
}

export function resolveVisionConfig(settings = {}) {
  return {
    provider: String(settings.provider || process.env.VISION_PROVIDER || 'custom').trim(),
    baseUrl: normalizeBaseUrl(settings.baseUrl || process.env.VISION_BASE_URL || ''),
    apiKey: String(settings.apiKey || process.env.VISION_API_KEY || '').trim(),
    model: String(settings.model || process.env.VISION_MODEL || '').trim(),
    temperature: (() => {
      const value = Number(settings.temperature);
      return Number.isFinite(value) ? Math.min(1.2, Math.max(0, value)) : 0.65;
    })(),
  };
}

export function isKeyOptional(config) {
  if (config.provider === 'ollama') return true;
  try {
    const hostname = new URL(config.baseUrl).hostname;
    return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
}

export function assertConfigured(config) {
  if (!config.baseUrl) {
    throw new VisionError(400, 'CONFIG_REQUIRED', '还没有配置模型接口地址');
  }
  if (!config.model) {
    throw new VisionError(400, 'CONFIG_REQUIRED', '还没有填写模型名称');
  }
  if (!config.apiKey && !isKeyOptional(config)) {
    throw new VisionError(400, 'CONFIG_REQUIRED', '还没有填写 API Key');
  }
  return config;
}

function authorizationHeaders(config) {
  return config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {};
}

async function readError(response) {
  let raw = '';
  try {
    raw = await response.text();
  } catch {
    return '';
  }
  const trimmed = raw.slice(0, 1200);
  try {
    const parsed = JSON.parse(trimmed);
    return (
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.error ||
      trimmed
    );
  } catch {
    return trimmed;
  }
}

async function fetchWithTimeout(url, options, timeoutMs = 120_000, externalSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onAbort, { once: true });
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') return part.text || part.content || '';
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (content && typeof content === 'object') return content.text || '';
  return '';
}

function messageText(message) {
  if (!message || typeof message !== 'object') {
    return { text: '', reasoning: '' };
  }
  return {
    text: contentToText(message.content).trim(),
    reasoning: contentToText(
      message.reasoning_content ?? message.reasoning ?? message.analysis,
    ).trim(),
  };
}

function responseDiagnostic(data, message, finishReason) {
  const content = contentToText(message?.content);
  const reasoning = contentToText(
    message?.reasoning_content ?? message?.reasoning ?? message?.analysis,
  );
  return JSON.stringify({
    finish_reason: finishReason || null,
    message_keys: message && typeof message === 'object' ? Object.keys(message) : [],
    content_type: typeof message?.content,
    content_length: content.length,
    reasoning_length: reasoning.length,
    usage: data?.usage || null,
    raw: JSON.stringify(data).slice(0, 900),
  });
}

function emptyRetryPayload(payload) {
  const retry = relaxedPayload(payload, 0);
  delete retry.max_completion_tokens;
  retry.max_tokens = 8192;
  retry.temperature = 0.2;
  return retry;
}

function friendlyUpstreamError(status, detail) {
  if (status === 401 || status === 403) {
    return new VisionError(502, 'AUTH_FAILED', 'API Key 无效、过期，或没有该模型的权限', detail);
  }
  if (status === 404) {
    return new VisionError(502, 'MODEL_NOT_FOUND', '接口地址或模型名称不存在，请检查设置', detail);
  }
  if (status === 429) {
    return new VisionError(502, 'RATE_LIMITED', '请求过于频繁或额度不足，请稍后再试', detail);
  }
  if (status >= 500) {
    return new VisionError(502, 'UPSTREAM_ERROR', '模型服务暂时不可用，请稍后重试', detail);
  }
  if (status === 400) {
    return new VisionError(
      502,
      'BAD_REQUEST',
      '模型服务不接受当前请求参数，请检查模型接入点或展开技术细节',
      detail,
    );
  }
  return new VisionError(502, 'UPSTREAM_ERROR', '模型服务返回了错误', detail);
}

async function requestCompletion(config, payload, timeoutMs = 120_000, externalSignal, retryDepth = 0) {
  const url = `${config.baseUrl}/chat/completions`;
  const body = { ...payload };
  let response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authorizationHeaders(config),
        },
        body: JSON.stringify(body),
      },
      timeoutMs,
      externalSignal,
    );
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new VisionError(504, 'UPSTREAM_TIMEOUT', '模型响应超时，请重试或换一个更快的模型');
    }
    const cause = error?.cause?.code || error?.code || '';
    throw new VisionError(
      502,
      'UPSTREAM_UNREACHABLE',
      '连不上模型服务，请检查接口地址与网络',
      cause ? String(cause) : '',
    );
  }

  if (!response.ok) {
    const detail = await readError(response);
    // 火山方舟等兼容服务对 response_format / max_tokens / image detail
    // 的支持不一致。400 时做两级降级重试，再决定是否报错。
    if (retryDepth < 2 && response.status === 400) {
      const retryBody = relaxedPayload(payload, retryDepth);
      return requestCompletion(config, retryBody, timeoutMs, externalSignal, retryDepth + 1);
    }
    throw friendlyUpstreamError(response.status, detail);
  }

  const raw = await response.text();
  if (Buffer.byteLength(raw, 'utf8') > 12 * 1024 * 1024) {
    throw new VisionError(502, 'RESPONSE_TOO_LARGE', '模型返回内容过大');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new VisionError(502, 'BAD_UPSTREAM_RESPONSE', '模型服务返回了无法解析的数据', raw.slice(0, 500));
  }
}

function relaxedPayload(payload, level = 0) {
  const relaxed = {
    ...payload,
    messages: (payload.messages || []).map((message) => {
      if (!Array.isArray(message.content)) return { ...message };
      return {
        ...message,
        content: message.content.map((part) => {
          if (part?.type !== 'image_url') return part;
          return { type: 'image_url', image_url: { url: part.image_url?.url } };
        }),
      };
    }),
  };
  delete relaxed.response_format;
  if (relaxed.max_tokens) {
    relaxed.max_completion_tokens = relaxed.max_tokens;
    delete relaxed.max_tokens;
  }
  if (level >= 1) {
    delete relaxed.max_completion_tokens;
    delete relaxed.temperature;
    delete relaxed.top_p;
  }
  return relaxed;
}

async function repairJson(rawText, config, externalSignal) {
  const messages = [
    {
      role: 'system',
      content: '你是 JSON 修复器。只输出一个合法 JSON 对象，不要解释，不要 Markdown 代码块。',
    },
    {
      role: 'user',
      content: `把下面的内容修复为合法 JSON。保留原有字段与值，不要新增解释：\n\n${String(rawText).slice(0, 14_000)}`,
    },
  ];
  const data = await requestCompletion(
    config,
    {
      model: config.model,
      messages,
      temperature: 0,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    },
    90_000,
    externalSignal,
  );
  const repaired = contentToText(data?.choices?.[0]?.message?.content);
  if (!repaired) throw new Error('empty repair');
  return parseModelJson(repaired);
}

/**
 * 是否支持「关思考」开关：DeepSeek 官方与火山方舟的 thinking 参数同形，
 * 其他 OpenAI 兼容服务（OpenAI / Qwen / GLM…）不认识这个字段，发了可能直接 400。
 */
export function fastModeSupported(baseUrl = '', model = '') {
  const url = String(baseUrl || '');
  const name = String(model || '');
  try {
    const host = new URL(url).hostname;
    if (/(^|\.)deepseek\.com$/i.test(host)) return true;
  } catch {
    // baseUrl 不是标准 URL 时退回字符串判断
  }
  return /volces\.com|ark\.cn-/i.test(url) || /deepseek|doubao/i.test(name);
}

export async function callVision({
  image,
  brief,
  platforms,
  strategies,
  rules,
  settings,
  signal,
  titlesPerPlatform = 1,
  fastMode = true,
}) {
  const config = assertConfigured(resolveVisionConfig(settings));
  const prompt = buildPrompt({ brief, platforms, strategies, rules, titlesPerPlatform });
  // 快速模式只在确认支持 thinking 开关的服务上发，避免 OpenAI 兼容层因未知字段 400。
  const fastModeApplied = Boolean(fastMode) && fastModeSupported(config.baseUrl, config.model);
  const startedAt = Date.now();

  const payload = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: image, detail: 'high' } },
        ],
      },
    ],
    temperature: config.temperature,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  };
  if (fastModeApplied) payload.thinking = { type: 'disabled' };

  let data = await requestCompletion(config, payload, 120_000, signal);
  let choice = data?.choices?.[0];
  let message = choice?.message;
  let extracted = messageText(message);

  if (
    !extracted.text &&
    (!extracted.reasoning || choice?.finish_reason === 'length')
  ) {
    if (choice?.finish_reason === 'content_filter') {
      throw new VisionError(
        502,
        'CONTENT_FILTERED',
        '模型拒绝了这张图片或提示词，请换一张图或换一个模型',
        responseDiagnostic(data, message, choice?.finish_reason),
      );
    }
    // 200 但 content 为空：常见于服务端不支持 JSON Mode、思维链占满
    // 输出预算、或只返回 reasoning_content。去掉 JSON Mode，提高预算重试一次。
    data = await requestCompletion(
      config,
      emptyRetryPayload(payload),
      120_000,
      signal,
    );
    choice = data?.choices?.[0];
    message = choice?.message;
    extracted = messageText(message);
  }

  if (!extracted.text && !extracted.reasoning) {
    throw new VisionError(
      502,
      'EMPTY_RESPONSE',
      '模型返回了空内容（可能被截断或只返回了思维链），请重试或换一个模型',
      responseDiagnostic(data, message, choice?.finish_reason),
    );
  }

  // 少数推理模型把 JSON 放在 reasoning_content，content 为空；优先用 content。
  const content = extracted.text || extracted.reasoning;

  let parsed;
  try {
    parsed = parseModelJson(content);
  } catch (error) {
    try {
      parsed = await repairJson(content, config, signal);
    } catch {
      throw new VisionError(
        502,
        'BAD_MODEL_JSON',
        '模型返回的不是有效 JSON，请重试或换一个模型',
        content.slice(0, 500),
      );
    }
  }

  return {
    raw: parsed,
    meta: {
      model: config.model,
      elapsedMs: Date.now() - startedAt,
      usage: data?.usage || null,
      fastMode: Boolean(fastMode),
      fastModeApplied,
    },
  };
}

export async function testConnection(settings) {
  const config = assertConfigured(resolveVisionConfig(settings));
  const startedAt = Date.now();
  const auth = authorizationHeaders(config);

  const modelsResponse = await fetchWithTimeout(
    `${config.baseUrl}/models`,
    { method: 'GET', headers: auth },
    20_000,
  ).catch((error) => {
    const cause = error?.cause?.code || error?.code || '';
    throw new VisionError(
      502,
      'UPSTREAM_UNREACHABLE',
      '连不上模型服务，请检查接口地址与网络',
      cause ? String(cause) : '',
    );
  });

  if (modelsResponse.ok) {
    let models = [];
    try {
      const data = await modelsResponse.json();
      models = Array.isArray(data?.data)
        ? data.data.map((item) => item?.id).filter(Boolean)
        : [];
    } catch {
      // 有些兼容服务 /models 返回非 JSON，但连通性已确认。
    }
    return {
      ok: true,
      mode: 'models',
      latencyMs: Date.now() - startedAt,
      models: models.slice(0, 12),
      modelCount: models.length,
      modelFound: models.length ? models.includes(config.model) : null,
    };
  }

  if (![401, 403].includes(modelsResponse.status)) {
    // /models 不可用时，用最小对话请求验证 chat/completions。
    const detail = await readError(modelsResponse);
    try {
      const data = await requestCompletion(
        config,
        {
          model: config.model,
          messages: [{ role: 'user', content: '只回复 OK' }],
          temperature: 0,
          max_tokens: 8,
        },
        30_000,
      );
      const reply = contentToText(data?.choices?.[0]?.message?.content);
      return {
        ok: true,
        mode: 'chat',
        latencyMs: Date.now() - startedAt,
        reply: reply.slice(0, 40),
        note: modelsResponse.status === 404 ? '该服务不提供 /models，已用对话接口验证' : '',
      };
    } catch (error) {
      if (error instanceof VisionError) throw error;
      throw new VisionError(502, 'TEST_FAILED', '模型连通性测试失败', detail);
    }
  }

  const detail = await readError(modelsResponse);
  throw friendlyUpstreamError(modelsResponse.status, detail);
}

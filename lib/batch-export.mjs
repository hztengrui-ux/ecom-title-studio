import { PLATFORMS, PLATFORM_ORDER } from './platforms.mjs';
import { normalizeRules } from './rules.mjs';
import { buildXlsx } from './xlsx.mjs';

function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function dateLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(date);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function platformShort(id) {
  return PLATFORMS[id]?.short || id;
}

function statusText(status) {
  return {
    queued: '待处理',
    processing: '处理中',
    done: '完成',
    error: '失败',
  }[status] || safeText(status, '未知');
}

export function buildBatchWorkbook(payload = {}) {
  const rules = normalizeRules(payload.rules || {});
  const items = (Array.isArray(payload.items) ? payload.items : []).slice(0, 300);
  const platformIds = unique([
    ...(Array.isArray(payload.platforms) ? payload.platforms : []),
    ...items.flatMap((item) => (item.result?.titles || []).map((title) => title.platform)),
  ]).filter((id) => PLATFORMS[id]);
  const orderedPlatforms = PLATFORM_ORDER.filter((id) => platformIds.includes(id));

  const done = items.filter((item) => item.status === 'done' && item.result);
  const failed = items.filter((item) => item.status === 'error');
  const pending = items.filter((item) => !['done', 'error'].includes(item.status));
  const model = payload.model || done[0]?.result?.meta?.model || '';
  const titleNow = new Date().toISOString();

  const resultHeader = [
    '序号',
    '文件名',
    'SKU',
    '状态',
    '商品名',
    '品类',
    '主标题',
    '对照',
    '标题数',
    '标题字数',
    '关键词',
    '商品描述',
    '描述字数',
    '长度达标',
    '风险词',
    '必含词缺失',
    '错误',
    '生成时间',
  ];

  const resultRows = [resultHeader];
  items.forEach((item, index) => {
    const result = item.result || null;
    const titles = result?.titles || [];
    const primary = titles[0] || null;
    const allOk = titles.length > 0 && titles.every((title) => title.lengthOk !== false);
    const riskWords = unique([
      ...titles.flatMap((title) => title.warnings || []),
      ...(result?.description?.warnings || []),
    ]);
    const missing = unique(titles.flatMap((title) => title.missingRequired || []));
    resultRows.push([
      index + 1,
      safeText(item.name),
      safeText(item.sku || item.name),
      statusText(item.status),
      result?.product?.name || '',
      result?.product?.category || '',
      primary?.text || '',
      primary?.translation || '',
      titles.length || 0,
      primary ? `${primary.chars} / ${primary.limit}` : '',
      (result?.keywords?.core || []).join('、'),
      result?.description?.text || '',
      result?.description?.chars ?? '',
      titles.length ? (allOk ? '全部达标' : '部分未达标') : '',
      riskWords.join('、'),
      missing.join('、'),
      item.status === 'error' ? safeText(item.error) : '',
      dateLabel(item.finishedAt || result?.meta?.generatedAt),
    ]);
  });

  const detailHeader = [
    '序号',
    '文件名',
    'SKU',
    '平台',
    '策略',
    '标题',
    '对照',
    '字数',
    '下限',
    '上限',
    '是否达标',
    '综合分',
    '风险词',
    '必含词缺失',
    '角度说明',
  ];
  const detailRows = [detailHeader];
  items.forEach((item, index) => {
    for (const title of item.result?.titles || []) {
      detailRows.push([
        index + 1,
        safeText(item.name),
        safeText(item.sku || item.name),
        platformShort(title.platform),
        title.strategyLabel || '',
        title.text || '',
        title.translation || '',
        title.chars ?? '',
        title.minChars ?? '',
        title.limit ?? '',
        title.lengthOk === false ? '低于下限' : '达标',
        title.score?.overall ?? '',
        (title.warnings || []).join('、'),
        (title.missingRequired || []).join('、'),
        title.reason || '',
      ]);
    }
  });

  const overviewRows = [
    ['项目', '内容'],
    ['导出文件', safeText(payload.title, '跨多多标题工坊批量导出')],
    ['导出时间', dateLabel(titleNow)],
    ['图片总数', items.length],
    ['完成', done.length],
    ['失败', failed.length],
    ['待处理', pending.length],
    ['模型', model || '内置示例 / 未记录'],
    ['平台', orderedPlatforms.map(platformShort).join(' / ') || '—'],
    ['中文标题范围', `${rules.titleMinZh}–${rules.titleMaxZh} 字`],
    ['英文标题范围', `${rules.titleMinEn}–${rules.titleMaxEn} 字符`],
    ['描述范围', `${rules.descriptionMin}–${rules.descriptionMax} 字`],
    ['核心关键词数量', `${rules.keywordMin}–${rules.keywordMax} 个`],
    ['必含关键词', rules.mustInclude.join('、') || '—'],
    ['自定义禁用词', rules.bannedWords.join('、') || '—'],
    ['关键词组合', rules.keywordCombos.join('；') || '—'],
    ['批量并发', `${rules.concurrency}`],
  ];

  const guideRows = [
    ['说明', '内容'],
    ['标题规则', '标题已按平台硬上限与用户设定范围截断；「低于下限」表示模型输出偏短，建议人工补足。'],
    ['描述规则', '描述由模型生成，已按用户设定上限截断；成分、认证、承重等事实仍需核对。'],
    ['风险词', '内置常见广告法风险词 + 用户自定义禁用词；命中不等于违法，但需要授权材料或事实依据。'],
    ['平台规则', '淘宝/天猫、拼多多、抖店、京东按中文 30 字上限；TEMU 120 字符、Amazon 200 字符作为硬上限。平台规则会调整，上架前以商家后台为准。'],
    ['隐私', '本文件由本机「跨多多标题工坊」生成；商品图与 API Key 不会写入本文件。'],
    ['生成器', '跨多多标题工坊 · 电商标题识图生成'],
  ];

  const sheets = [
    { name: '批量结果', widths: [6, 24, 18, 9, 22, 16, 42, 34, 7, 12, 24, 48, 9, 11, 18, 16, 24, 18], rows: resultRows },
    { name: '标题明细', widths: [6, 24, 18, 10, 9, 50, 34, 7, 7, 7, 10, 8, 18, 16, 34], rows: detailRows },
    { name: '生成概览', widths: [18, 76], rows: overviewRows },
    { name: '使用说明', widths: [18, 90], rows: guideRows },
  ];

  return buildXlsx(sheets, { title: safeText(payload.title, '跨多多标题工坊批量导出') });
}

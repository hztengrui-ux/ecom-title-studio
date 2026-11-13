import { buildXlsx } from './xlsx.mjs';

function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

export function buildBatchWorkbook(payload = {}) {
  const items = (Array.isArray(payload.items) ? payload.items : []).slice(0, 300);

  // 只导出上架直接要用的 2 列：SKU（图片文件名）+ 主标题。
  // 状态、商品名、品类、描述、关键词等中间结果一律不导出，减少人工筛选与文件体积。
  const resultRows = [['SKU', '主标题']];
  items.forEach((item) => {
    const primary = item.result?.titles?.[0] || null;
    resultRows.push([
      safeText(item.sku || item.name),
      primary?.text || '',
    ]);
  });

  return buildXlsx(
    [{ name: '批量结果', widths: [24, 96], rows: resultRows }],
    { title: safeText(payload.title, '跨多多标题工坊批量导出') },
  );
}

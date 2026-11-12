<template>
  <el-dialog
    v-model="visible"
    width="1120px"
    top="4vh"
    class="preview-dialog"
    destroy-on-close
    :close-on-click-modal="true"
  >
    <template #header>
      <div class="preview-head">
        <span class="eyebrow">FOLDER PREVIEW</span>
        <h2>文件夹效果预览</h2>
        <p>{{ summary }}</p>
      </div>
    </template>

    <div class="preview-layout">
      <aside class="preview-tree">
        <div class="preview-tree-root">📁 {{ baseName }}/</div>
        <div class="preview-tree-file is-xlsx">{{ baseName }}.xlsx</div>
        <template v-if="state.rules.saveOriginalImages !== false">
          <div class="preview-tree-folder">images/</div>
          <div v-for="(name, index) in imageNames" :key="index" class="preview-tree-file">  {{ name }}</div>
        </template>
        <div class="preview-tree-file is-html">{{ baseName }}-预览.html</div>
        <div class="preview-tree-file">{{ baseName }}-数据.json</div>
        <p class="preview-tree-count">{{ doneItems.length }} 张图 · 已选 {{ selectedTitleCount }}/{{ totalTitles }} 条标题 · {{ state.rules.saveOriginalImages === false ? '不保存原图' : '保存原图' }}</p>
      </aside>

      <div class="preview-main">
        <article v-for="item in doneItems" :key="item.id" class="preview-item">
          <div class="preview-item-head">
            <img :src="item.previewUrl || '/favicon.svg'" :alt="item.name" />
            <div>
              <small>SKU {{ item.sku || item.name }} · {{ item.name }}</small>
              <h3>{{ item.result?.product?.name || '未命名商品' }}</h3>
              <p>{{ item.result?.product?.summary }}</p>
              <div class="preview-keywords">
                <span v-for="word in topKeywords(item)" :key="word">{{ word }}</span>
              </div>
            </div>
          </div>
          <div class="preview-titles">
            <label v-for="(title, index) in item.result?.titles || []" :key="index" class="preview-title-row" :class="{ 'is-unselected': !selectedIndexes(item).has(index) }">
              <el-checkbox :model-value="selectedIndexes(item).has(index)" @change="(value) => toggleBatchTitle(item, index, value)" />
              <span class="preview-platform">{{ platformShort(title.platform) }} · {{ title.strategyLabel }}</span>
              <div class="preview-title-text">
                <p>{{ title.text }}</p>
                <small v-if="title.translation">{{ title.translation }}</small>
              </div>
              <em>{{ title.chars }}/{{ title.limit }}</em>
            </label>
          </div>
        </article>
      </div>
    </div>

    <template #footer>
      <div class="preview-foot">
        <span>这里只是预览，不会写入磁盘</span>
        <div>
          <el-button :disabled="!selectedTitleCount" @click="exportBatchExcel">导出已选 Excel</el-button>
          <el-button type="primary" :disabled="!selectedTitleCount" @click="saveFolder">保存这个文件夹</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';
import {
  state,
  doneBatchItems,
  selectedTitleCount,
  selectedIndexes,
  toggleBatchTitle,
  platformShort,
  batchBaseName,
  exportBatchExcel,
  saveBatchFolder,
} from '../store.js';

const visible = computed({
  get: () => state.ui.preview,
  set: (value) => { state.ui.preview = value; },
});
const baseName = computed(() => batchBaseName());
const doneItems = computed(() => doneBatchItems.value);
const totalTitles = computed(() => doneItems.value.reduce((sum, item) => sum + (item.result?.titles?.length || 0), 0));
const summary = computed(() => `${doneItems.value.length} 张图片 · 已选 ${selectedTitleCount.value}/${totalTitles.value} 条标题 · 预览不会写入磁盘`);
const imageNames = computed(() => doneItems.value.map((item, index) => {
  const ext = item.file ? (item.file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg').toLowerCase() : '.svg';
  const base = String(item.name || 'image').replace(/\.[a-z0-9]+$/i, '').replace(/[\\/:*?"<>|]/g, '-').slice(0, 70);
  return `${String(index + 1).padStart(3, '0')}-${base}${ext}`;
}));
function topKeywords(item) {
  return [...(item.result?.keywords?.core || []), ...(item.result?.keywords?.long_tail || [])].slice(0, 8);
}
async function saveFolder() {
  await saveBatchFolder();
}
</script>

<template>
  <div class="batch-workspace" @dragover.prevent @drop.prevent="onBatchDrop">
    <div class="batch-view">
      <div class="batch-toolbar">
        <div class="batch-heading">
          <div class="step-line">
            <span class="step-no">01</span><span class="step-label">批量任务</span>
            <div class="mode-switch">
              <button type="button" @click="state.mode = 'single'">单张</button>
              <button type="button" class="is-active" @click="state.mode = 'batch'">批量</button>
            </div>
          </div>
          <h3>实时队列</h3>
          <p>{{ batchSummary }}</p>
        </div>
        <div class="batch-actions">
          <button type="button" class="primary-btn" :disabled="busy || !state.batch.items.length || allDone" @click="startBatch">
            {{ busy ? (state.batch.phase === 'preprocess' ? '预处理中…' : '识别中…') : allDone ? '已完成' : '开始处理' }}
          </button>
          <button type="button" class="ghost-btn" :disabled="busy || !state.batch.items.length" @click="preprocessOnly">预处理</button>
          <button v-if="busy" type="button" class="ghost-btn" @click="stopBatch">停止</button>
          <button type="button" class="ghost-btn" :disabled="!selectedTitleCount" @click="openPreview">预览文件夹</button>
          <button type="button" class="ghost-btn" :disabled="!selectedTitleCount" @click="exportBatchExcel">导出已选 Excel</button>
          <button type="button" class="ghost-btn" :disabled="!selectedTitleCount" @click="exportBatchCsv">导出已选 CSV</button>
          <button type="button" class="ghost-btn" :disabled="!selectedTitleCount" @click="saveBatchFolder">保存已选到文件夹</button>
          <button type="button" class="ghost-btn" :disabled="busy || !state.batch.items.length" @click="clearBatch">清空</button>
        </div>
      </div>

      <div class="batch-progress"><i :style="{ width: `${progress}%` }"></i></div>
      <div class="batch-stats">
        <div class="batch-stat"><strong>{{ counts.total }}</strong><span>图片</span></div>
        <div class="batch-stat"><strong>{{ counts.done }}</strong><span>完成</span></div>
        <div class="batch-stat"><strong>{{ counts.processing }}</strong><span>识别中</span></div>
        <div class="batch-stat"><strong>{{ counts.failed }}</strong><span>失败</span></div>
      </div>

      <div v-if="preprocessText" class="batch-preprocess-status">{{ preprocessText }}</div>

      <label class="batch-name-field">
        <span>Excel / 文件夹名称</span>
        <input v-model="state.batch.name" :placeholder="defaultBatchName()" maxlength="80" />
      </label>

      <div class="batch-import-actions">
        <button type="button" class="outline-btn" :disabled="busy" @click="folderInput?.click()"><el-icon><FolderOpened /></el-icon>选择文件夹</button>
        <button type="button" class="ghost-btn" :disabled="busy" @click="fileInput?.click()"><el-icon><Picture /></el-icon>选择图片</button>
        <button type="button" class="ghost-btn" :disabled="busy" @click="addBatchSamples"><el-icon><Files /></el-icon>载入示例</button>
      </div>

      <details class="batch-settings" open>
        <summary>
          <span>批量设置</span>
          <small>前缀 / 后缀 · 并发 · 图片预处理 · 自定义提示词</small>
        </summary>
        <div class="batch-settings-grid">
          <label class="field batch-mode-field">
            <span>标题类型</span>
            <select :value="state.rules.assetMode ? 'asset' : 'product'" @change="setAssetMode">
              <option value="asset">素材描述（服装/印花，不写行业词）</option>
              <option value="product">商品标题（按品类/场景）</option>
            </select>
          </label>

          <label class="field">
            <span>目标类目 <em>不选则通用素材</em></span>
            <select v-model="state.rules.targetCategory" @change="persistRules">
              <option v-for="option in TARGET_CATEGORY_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label v-if="state.rules.targetCategory === 'custom'" class="field">
            <span>自定义类目名称</span>
            <input v-model="state.rules.targetCategoryLabel" maxlength="30" placeholder="例如：宠物用品" @input="persistRules" />
          </label>

          <label class="field">
            <span>标题前缀 <em>固定保留，不截断</em></span>
            <input v-model="state.rules.titlePrefix" placeholder="例如：女士秋冬新款简约百搭开衫毛衣" @input="persistRules" />
          </label>
          <label class="field">
            <span>标题后缀 <em>固定保留，不截断</em></span>
            <input v-model="state.rules.titleSuffix" placeholder="例如：宽松休闲长袖针织上衣" @input="persistRules" />
          </label>

          <label class="field">
            <span>并发数 <em>自动按 CPU / 内存，2–10</em></span>
            <select :value="concurrencyValue" @change="setConcurrency">
              <option value="auto">自动（推荐 {{ recommendedConcurrency() }} 张/次）</option>
              <option v-for="n in 20" :key="n" :value="String(n)">{{ n }} 张 / 次{{ n === 1 ? '（最稳）' : n >= 12 ? '（较快）' : '' }}</option>
            </select>
          </label>
          <label class="field">
            <span>缩放方式</span>
            <select v-model="state.rules.imageResizeMode" @change="persistRules">
              <option value="width">按宽度等比</option>
              <option value="longest">按最长边</option>
            </select>
          </label>

          <label class="field">
            <span>目标尺寸 <em>px · 可选可填</em></span>
            <input v-model.number="state.rules.imageMaxEdge" type="number" min="320" max="4096" list="image-edges" @change="persistRules" />
            <datalist id="image-edges">
              <option v-for="n in [548, 640, 768, 1024, 1280, 1600, 2048]" :key="n" :value="n"></option>
            </datalist>
          </label>
          <label class="field">
            <span>目标长度 <em>0 = 平台默认</em></span>
            <input v-model.number="state.rules.targetLength" type="number" min="0" max="200" @change="persistRules" />
          </label>

          <label class="field">
            <span>标题语言</span>
            <select v-model="state.rules.language" @change="persistRules">
              <option value="auto">跟随平台</option>
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <div class="field">
            <span>快速模式 <em>关思考链 · 更快更省</em></span>
            <label class="fast-mode-toggle">
              <input v-model="state.rules.fastMode" type="checkbox" @change="persistRules" />
              <span>{{ state.rules.fastMode ? '已开启：不生成思维链，实测单张约省 80% 输出 token' : '已关闭：保留思考链，复杂商品更稳但更贵' }}</span>
            </label>
          </div>
          <label class="field">
            <span>禁用关键词 <em>一行一个，标题和描述都会检测</em></span>
            <textarea v-model="bannedText" rows="2" placeholder="例如：全网最低&#10;绝对安全" @input="saveBanned"></textarea>
          </label>

          <label class="field">
            <span>提示词模板</span>
            <select v-model="promptPreset" @change="applyPromptPreset">
              <option value="standard">标准转化</option>
              <option value="festival">节日 / 礼赠</option>
              <option value="param">参数 / 材质</option>
              <option value="brand">品牌克制</option>
              <option value="custom">自定义</option>
            </select>
          </label>
          <label class="field batch-prompt-field">
            <span>自定义提示词</span>
            <textarea v-model="state.rules.customPrompt" rows="2" @input="persistRules"></textarea>
          </label>

          <label class="field batch-output-dir">
            <span>保存位置 <em>不选则保存时再选</em></span>
            <div class="batch-dir-row">
              <input v-model="state.rules.outputDir" placeholder="默认：保存时选择文件夹" @input="persistRules" />
              <button type="button" class="ghost-btn" @click="chooseOutputDir">选择</button>
            </div>
          </label>
          <label class="batch-check">
            <el-checkbox v-model="state.rules.saveOriginalImages" @change="persistRules">保存原图到结果文件夹</el-checkbox>
          </label>
        </div>
        <div class="batch-settings-foot">
          <button type="button" class="text-btn" @click="persistRules(); toast('批量设置已保存', 'success')">保存这些设置</button>
          <button type="button" class="text-btn" @click="state.ui.rules = true">标题长度 / 禁用词 / 必含词 →</button>
          <span>输出：Excel / CSV · 原图可选 · HTML 预览</span>
        </div>
        <div class="batch-template-row">
          <span>复用模板</span>
          <button type="button" class="ghost-btn" @click="saveBatchTemplate">存为模板</button>
          <button type="button" class="ghost-btn" @click="templateInput?.click()">载入模板</button>
          <input ref="templateInput" type="file" accept=".json,application/json" hidden @change="onTemplateFile" />
          <small>JSON 文件，可存到任意盘</small>
        </div>
      </details>

      <div class="batch-filter-row">
        <label class="batch-filter">
          <el-icon><Search /></el-icon>
          <input v-model="state.batch.filter" placeholder="按图片文件名 / SKU 筛选" />
        </label>
        <button v-if="state.batch.filter" type="button" class="text-btn" @click="state.batch.filter = ''">清空筛选</button>
        <span class="batch-filter-count">筛选 {{ filteredBatchItems.length }}/{{ state.batch.items.length }} · 已选 {{ selectedTitleCount }} 条</span>
      </div>

      <div v-if="!state.batch.items.length" class="batch-empty">
        <div class="batch-empty-icon"><el-icon><UploadFilled /></el-icon></div>
        <h3>把一批商品图放进来</h3>
        <p>支持选择整个文件夹，队列会逐张处理。每完成一张，右侧会实时出现它的关键词、标题和描述；最后可导出 Excel，或直接保存到指定文件夹。</p>
        <div class="batch-empty-actions">
          <button type="button" class="outline-btn" :disabled="busy" @click="folderInput?.click()"><el-icon><FolderOpened /></el-icon>选择文件夹</button>
          <button type="button" class="ghost-btn" :disabled="busy" @click="fileInput?.click()"><el-icon><Picture /></el-icon>选择图片</button>
          <button type="button" class="ghost-btn" :disabled="busy" @click="addBatchSamples"><el-icon><Files /></el-icon>载入 {{ state.samples.length }} 个示例</button>
        </div>
      </div>

      <div v-else class="batch-list">
        <article
          v-for="(item, index) in filteredBatchItems"
          :key="item.id"
          class="batch-card"
          :class="{ 'is-open': state.batch.expanded.has(item.id) }"
        >
          <div class="batch-card-header" @click="toggleExpanded(item.id)">
            <div class="batch-thumb"><img :src="item.previewUrl || '/favicon.svg'" :alt="item.name" /></div>
            <div class="batch-card-main">
              <div class="batch-file">
                <span class="batch-status" :data-status="item.status">{{ statusLabel(item.status) }}</span>
                <span class="batch-sku" :title="item.name">SKU {{ item.sku || item.name }}</span>
                <span v-if="item.preprocessState === 'done' && item.file" class="batch-file-preprocess">· 已压缩 {{ item.processedWidth }}×{{ item.processedHeight }} · {{ formatBytes(item.processedSize) }}</span>
              </div>
              <div class="batch-product">{{ item.result?.product?.name || item.name }}</div>
              <div class="batch-keywords">
                <span v-for="word in topKeywords(item)" :key="word">{{ word }}</span>
                <span v-if="item.status === 'error'" class="is-error">{{ item.error }}</span>
              </div>
            </div>
            <div class="batch-best">
              <div v-if="item.result?.titles?.length" class="batch-best-title">{{ item.result.titles[0].text }}</div>
              <div v-else-if="item.status === 'processing'" class="batch-best-title is-muted">正在识别…</div>
              <div v-else-if="item.status === 'error'" class="batch-best-title is-muted">处理失败</div>
              <div v-else class="batch-best-title is-muted">等待处理</div>
              <div v-if="item.result" class="batch-best-meta">
                {{ platformShort(item.result.titles[0]?.platform) }} · {{ item.result.titles.length }} 条 · 已选 {{ selectedIndexes(item).size }}/{{ item.result.titles.length }}<template v-if="item.elapsedMs"> · {{ formatDuration(item.elapsedMs) }}</template>
              </div>
            </div>
            <el-icon class="batch-chevron"><ArrowRight /></el-icon>
          </div>

          <div v-if="state.batch.expanded.has(item.id)" class="batch-detail">
            <template v-if="item.result">
              <div v-for="(title, titleIndex) in item.result.titles" :key="titleIndex" class="batch-detail-row">
                <label class="batch-title-check">
                  <el-checkbox :model-value="selectedIndexes(item).has(titleIndex)" @change="(value) => toggleBatchTitle(item, titleIndex, value)" />
                </label>
                <div class="batch-detail-platform">{{ platformShort(title.platform) }}</div>
                <div class="batch-detail-title-box">
                  <div class="batch-detail-title">{{ title.text }}</div>
                  <div class="batch-detail-subline">
                    <span>{{ title.strategyLabel }}</span>
                    <span v-if="title.translation">{{ title.translation }}</span>
                  </div>
                </div>
                <button type="button" class="batch-detail-copy" title="复制标题" @click="copyText(title.text)"><el-icon><CopyDocument /></el-icon></button>
              </div>
              <div v-if="item.result.description?.text" class="batch-detail-desc">描述（{{ item.result.description.chars }} 字）：{{ item.result.description.text }}</div>
              <div class="batch-detail-actions">
                <button type="button" @click="selectAllTitles(item, true)">全选标题</button>
                <button type="button" @click="selectAllTitles(item, false)">全不选</button>
                <button type="button" @click="copyItemTitles(item)">复制全部标题</button>
                <button type="button" @click="removeBatchItem(item.id)">移除</button>
              </div>
            </template>
            <template v-else-if="item.status === 'error'">
              <div class="batch-detail-error">{{ item.error || '处理失败，请重试。' }}</div>
              <div class="batch-detail-actions">
                <button type="button" @click="item.status = 'queued'; item.error = ''; startBatch()">重试</button>
                <button type="button" @click="removeBatchItem(item.id)">移除</button>
              </div>
            </template>
            <template v-else>
              <div class="batch-detail-desc">{{ item.status === 'processing' ? '正在识别这张图…' : '等待开始处理。' }}</div>
            </template>
          </div>
        </article>
      </div>

      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden @change="onFilesChange" />
      <input ref="folderInput" type="file" webkitdirectory directory multiple hidden @change="onFilesChange" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  state,
  filteredBatchItems,
  selectedTitleCount,
  selectedIndexes,
  preprocessStats,
  formatBytes,
  formatDuration,
  recommendedConcurrency,
  persistRules,
  chooseOutputDir,
  addBatchFiles,
  addBatchSamples,
  startBatch,
  stopBatch,
  preprocessOnly,
  clearBatch,
  removeBatchItem,
  toggleBatchTitle,
  selectAllTitles,
  copyText,
  openPreview,
  exportBatchExcel,
  exportBatchCsv,
  saveBatchFolder,
  saveBatchTemplate,
  applyBatchTemplate,
  defaultBatchName,
  platformShort,
  TARGET_CATEGORY_OPTIONS,
  toast,
} from '../store.js';

const fileInput = ref(null);
const folderInput = ref(null);
const templateInput = ref(null);
const promptPreset = ref('custom');

const busy = computed(() => state.batch.running || state.batch.preprocess.running);
const counts = computed(() => {
  const items = state.batch.items;
  return {
    total: items.length,
    done: items.filter((item) => item.status === 'done').length,
    failed: items.filter((item) => item.status === 'error').length,
    processing: items.filter((item) => item.status === 'processing').length,
  };
});
const allDone = computed(() => state.batch.items.length > 0 && state.batch.items.every((item) => item.status === 'done'));
const progress = computed(() => {
  if (!state.batch.items.length) return 0;
  const completed = state.batch.items.filter((item) => ['done', 'error'].includes(item.status)).length;
  const processing = state.batch.items.filter((item) => item.status === 'processing').length * 0.45;
  return Math.min(100, Math.round(((completed + processing) / state.batch.items.length) * 100));
});
const batchSummary = computed(() => {
  if (!state.batch.items.length) return '导入文件夹，队列会逐张识别并匹配标题。';
  if (busy.value) return state.batch.phase === 'preprocess' ? `正在预处理 · 已完成 ${preprocessStats.value.done}/${preprocessStats.value.total} · 4 路并行` : `正在识别 · 已完成 ${counts.value.done}/${counts.value.total} · 并发 ${state.batch.concurrencyUsed}`;
  return `处理完成 · 成功 ${counts.value.done} 张${counts.value.failed ? ` · 失败 ${counts.value.failed}` : ''}${state.batch.elapsedMs ? ` · 总用时 ${formatDuration(state.batch.elapsedMs)}` : ''}`;
});
const preprocessText = computed(() => {
  const stats = preprocessStats.value;
  if (!stats.total) return '';
  if (state.batch.preprocess.running) return `① 正在预处理 ${state.batch.preprocess.done}/${state.batch.preprocess.total} · ${formatBytes(stats.original)} → ${formatBytes(stats.processed)}`;
  if (busy.value) return `② 正在识别 ${counts.value.done}/${counts.value.total} · ① 已预处理 ${stats.done}/${stats.total}`;
  return `已预处理 ${stats.done}/${stats.total} 张 · ${formatBytes(stats.original)} → ${formatBytes(stats.processed)}${stats.original ? `（节省 ${Math.max(0, Math.round((1 - stats.processed / stats.original) * 100))}%）` : ''}`;
});
const concurrencyValue = computed({
  get: () => state.rules.concurrencyMode === 'auto' ? 'auto' : String(state.rules.concurrency),
  set: (value) => {
    if (value === 'auto') {
      state.rules.concurrencyMode = 'auto';
      state.rules.concurrency = recommendedConcurrency();
    } else {
      state.rules.concurrencyMode = 'manual';
      state.rules.concurrency = Number(value);
    }
    persistRules();
  },
});
const bannedText = computed({
  get: () => (state.rules.bannedWords || []).join('\n'),
  set: (value) => {
    state.rules.bannedWords = String(value || '').split(/\n|,|，|、|;/).map((word) => word.trim()).filter(Boolean);
    persistRules();
  },
});

function setConcurrency(event) {
  concurrencyValue.value = event.target.value;
}
function setAssetMode(event) {
  state.rules.assetMode = event.target.value === 'asset';
  persistRules();
}
function saveBanned() {
  persistRules();
}
function applyPromptPreset() {
  const preset = promptPreset.value;
  if (preset === 'custom') return;
  state.rules.customPrompt = {
    standard: '请结合图片和卖点，突出材质、适用场景、人群，提升点击转化率。',
    festival: '请突出节日/礼赠场景、图案主题与氛围，不写价格、销量、折扣。',
    param: '优先写清材质、尺寸、容量、结构等可验证参数，图片看不出的信息不要猜测。',
    brand: '保持简洁、克制的品牌语气，避免夸张词、极限词和平台违禁词。',
  }[preset] || state.rules.customPrompt;
  persistRules();
}

function onFilesChange(event) {
  addBatchFiles(event.target.files);
  event.target.value = '';
}
function onBatchDrop(event) {
  if (busy.value) {
    toast('正在处理，完成后再添加图片', 'error');
    return;
  }
  const files = [...(event.dataTransfer?.files || [])];
  if (files.length) addBatchFiles(files);
}
function toggleExpanded(id) {
  const next = new Set(state.batch.expanded);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  state.batch.expanded = next;
}
function statusLabel(status) {
  return { queued: '等待', processing: '识别中', done: '已完成', error: '失败' }[status] || status;
}
function topKeywords(item) {
  return [...(item.result?.keywords?.core || []), ...(item.result?.keywords?.long_tail || [])].slice(0, 6);
}
function copyItemTitles(item) {
  copyText((item.result?.titles || []).map((title) => title.text).join('\n'));
}
async function onTemplateFile(event) {
  const file = event.target.files?.[0];
  try {
    await applyBatchTemplate(file);
  } catch (error) {
    toast(error.message || '模板载入失败', 'error');
  } finally {
    event.target.value = '';
  }
}
</script>


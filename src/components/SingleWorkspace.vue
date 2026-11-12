<template>
  <div class="workspace">
    <section class="brief-col" aria-labelledby="briefTitle">
      <div class="brief-scroll">
        <header class="col-head">
          <div class="step-line">
            <span class="step-no">01</span><span class="step-label">商品输入</span>
            <div class="mode-switch">
              <button type="button" :class="{ 'is-active': true }" @click="state.mode = 'single'">单张</button>
              <button type="button" @click="state.mode = 'batch'">批量</button>
            </div>
          </div>
        </header>

        <h1 id="briefTitle" class="brief-title">一张商品图，<br /><em>写出平台标题。</em></h1>
        <p class="brief-sub">上传商品图，AI 识别材质、结构与卖点，按平台规则生成可直接上架的标题、描述与关键词。</p>

        <div
          class="dropzone"
          :class="{ 'has-image': state.single.image }"
          tabindex="0"
          @click="fileInput?.click()"
          @keydown.enter.prevent="fileInput?.click()"
          @dragover.prevent
          @drop.prevent="onDrop"
        >
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onFileChange" />
          <template v-if="state.single.image">
            <img :src="state.single.image.previewUrl" alt="商品图预览" class="drop-preview" />
            <div class="drop-overlay">
              <span>点击更换图片</span>
              <button type="button" class="drop-remove" @click.stop="clearSingleImage">移除</button>
            </div>
          </template>
          <template v-else>
            <div class="drop-empty">
              <span class="drop-icon"><el-icon><Upload /></el-icon></span>
              <strong>拖入商品图，或点击上传</strong>
              <small>JPG / PNG / WebP · 建议 800px 以上</small>
              <span class="drop-hint">也可以直接 Ctrl+V 粘贴</span>
            </div>
          </template>
        </div>

        <div v-if="state.samples.length" class="sample-strip">
          <div class="sample-head"><span>没有素材？</span><em>试试示例</em></div>
          <div class="sample-list">
            <button
              v-for="sample in state.samples"
              :key="sample.id"
              type="button"
              class="sample-btn"
              :class="{ 'is-active': state.single.image?.sampleId === sample.id }"
              @click="selectSample(sample)"
            >
              <img :src="sample.file" :alt="sample.label" />
              <span>{{ sample.label }}</span>
            </button>
          </div>
        </div>

        <div class="brief-fields">
          <label class="field">
            <span>目标类目 <em>不选则通用素材</em></span>
            <el-select v-model="targetCategory" size="small">
              <el-option v-for="option in TARGET_CATEGORY_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </label>
          <label v-if="state.rules.targetCategory === 'custom'" class="field">
            <span>自定义类目名称</span>
            <el-input v-model="state.rules.targetCategoryLabel" size="small" maxlength="30" placeholder="例如：宠物用品" @input="persistRules" />
          </label>
          <label class="field">
            <span>主题 / 品类 <em>可选</em></span>
            <el-input v-model="state.brief.category" size="small" placeholder="例如：圣诞、花卉、通勤" @input="persistBrief" />
          </label>
          <label class="field">
            <span>画面元素 / 卖点 <em>可选</em></span>
            <el-input v-model="state.brief.sellingPoints" type="textarea" :rows="2" resize="none" placeholder="例如：红黑格纹、圣诞老人、驯鹿" @input="persistBrief" />
          </label>
          <label class="field">
            <span>适用素材 / 人群 <em>可选</em></span>
            <el-input v-model="state.brief.audience" size="small" placeholder="例如：女装、通勤、节日礼赠" @input="persistBrief" />
          </label>
        </div>

        <div class="section-label">发布平台 <em>可多选</em></div>
        <div class="platform-chips">
          <button
            v-for="platform in state.platforms"
            :key="platform.id"
            type="button"
            class="chip"
            :class="{ 'is-selected': state.selectedPlatforms.includes(platform.id) }"
            @click="togglePlatform(platform.id)"
          >
            <span class="chip-dot"></span>{{ platform.short }}
          </button>
        </div>

        <div class="section-label">标题策略 <em>最多 3 个</em></div>
        <div class="strategy-chips">
          <button
            v-for="strategy in state.strategies"
            :key="strategy.id"
            type="button"
            class="strategy-chip"
            :class="{ 'is-selected': state.selectedStrategies.includes(strategy.id) }"
            @click="toggleStrategy(strategy.id)"
          >
            {{ strategy.label }}
          </button>
        </div>

        <button type="button" class="rules-summary-btn" @click="state.ui.rules = true">
          <span class="rules-summary-icon"><el-icon><SetUp /></el-icon></span>
          <span class="rules-summary-text">
            <strong>生成规则</strong>
            <small>{{ rulesSummary }}</small>
          </span>
          <el-icon class="rules-summary-arrow"><ArrowRight /></el-icon>
        </button>
      </div>

      <div class="generate-bar">
        <button type="button" class="primary-btn" :disabled="state.single.busy" @click="generateSingle">
          <el-icon v-if="state.single.busy" class="is-loading"><Loading /></el-icon>
          <el-icon v-else><MagicStick /></el-icon>
          {{ state.single.busy ? '正在生成…' : '生成标题' }}
        </button>
        <span class="generate-meta">{{ generateMeta }}</span>
      </div>
    </section>

    <ResultPanel />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  state,
  persistBrief,
  persistRules,
  setRules,
  togglePlatform,
  toggleStrategy,
  selectSample,
  selectSingleFile,
  clearSingleImage,
  generateSingle,
  TARGET_CATEGORY_OPTIONS,
  copyText,
} from '../store.js';
import ResultPanel from './ResultPanel.vue';

const fileInput = ref(null);

const targetCategory = computed({
  get: () => state.rules.targetCategory,
  set: (value) => setRules({ targetCategory: value }),
});

const rulesSummary = computed(() => {
  const rules = state.rules;
  return `${rules.assetMode ? '素材描述' : '商品标题'} · 中文 ${rules.titleMinZh}-${rules.titleMaxZh} 字 · 描述 ${rules.descriptionMin}-${rules.descriptionMax} 字 · 并发 ${rules.concurrencyMode === 'auto' ? `自动 ${rules.concurrency}` : rules.concurrency}`;
});

const generateMeta = computed(() => {
  const platforms = state.platforms
    .filter((platform) => state.selectedPlatforms.includes(platform.id))
    .map((platform) => platform.short);
  return `${platforms.join(' / ') || '未选平台'} · ${state.selectedStrategies.length} 条策略`;
});

function onFileChange(event) {
  const file = event.target.files?.[0];
  if (file) selectSingleFile(file);
  event.target.value = '';
}

function onDrop(event) {
  const file = event.dataTransfer?.files?.[0];
  if (file) selectSingleFile(file);
}

async function onPaste(event) {
  const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith('image/'));
  if (!item) return;
  const file = item.getAsFile();
  if (file) selectSingleFile(file);
}

onMounted(() => window.addEventListener('paste', onPaste));
onUnmounted(() => window.removeEventListener('paste', onPaste));
</script>

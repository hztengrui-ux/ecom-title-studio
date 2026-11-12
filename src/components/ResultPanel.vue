<template>
  <section class="result-col" aria-label="生成结果">
    <header class="result-head">
      <div>
        <div class="step-line"><span class="step-no">02</span><span class="step-label">生成结果</span></div>
        <h2>{{ resultTitle }}</h2>
        <p>{{ resultSub }}</p>
      </div>
      <div class="result-head-actions">
        <button v-if="state.single.result" type="button" class="ghost-btn" :disabled="state.single.busy" @click="generateSingle">
          <el-icon><Refresh /></el-icon> 换一批
        </button>
      </div>
    </header>

    <div v-if="state.single.busy" class="loading-state">
      <div class="loading-visual">
        <span class="orbit orbit-a"></span><span class="orbit orbit-b"></span>
        <span class="loading-core"><el-icon><View /></el-icon></span>
      </div>
      <h3>{{ loadingText }}</h3>
      <p>{{ loadingTip }}</p>
      <div class="loading-steps">
        <span v-for="(label, index) in ['读图', '识别', '写标题', '校验']" :key="label" :class="{ 'is-active': index <= state.single.loadingStep }">{{ label }}</span>
      </div>
    </div>

    <div v-else-if="state.single.error" class="error-state">
      <span class="error-icon"><el-icon><WarningFilled /></el-icon></span>
      <h3>{{ state.single.error.title }}</h3>
      <p>{{ state.single.error.message }}</p>
      <details v-if="state.single.error.detail" class="error-detail">
        <summary>查看技术细节</summary>
        <pre>{{ state.single.error.detail }}</pre>
      </details>
      <div class="error-actions">
        <el-button type="primary" @click="generateSingle">重试</el-button>
        <el-button @click="state.ui.settings = true">打开设置</el-button>
      </div>
    </div>

    <div v-else-if="!state.single.result" class="empty-state">
      <div class="empty-visual vue-empty-visual">
        <span class="empty-orbit"></span>
        <span class="empty-sheet">
          <span class="sheet-kicker">TITLE PREVIEW</span>
          <strong>Aa</strong>
          <i></i><i></i><i></i>
        </span>
      </div>
      <div class="empty-copy">
        <span class="eyebrow">WAITING FOR AN IMAGE</span>
        <h3>等待一张商品图</h3>
        <p>上传后约 15–40 秒，具体取决于模型速度。</p>
        <div class="empty-steps">
          <div><b>01</b><span>上传商品图<small>主体清晰，背景干净</small></span></div>
          <div><b>02</b><span>选择平台<small>可同时生成多个平台</small></span></div>
          <div><b>03</b><span>复制上架<small>字数与风险词已检查</small></span></div>
        </div>
      </div>
    </div>

    <div v-else class="result-content">
      <div v-if="state.single.result.meta?.demo" class="demo-banner">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ state.single.result.meta.demoNote || '当前为演示数据，配置模型后可识别你自己的商品图。' }}</span>
        <button type="button" @click="state.ui.settings = true">配置模型</button>
      </div>

      <article class="insight-card">
        <div class="insight-thumb">
          <img :src="state.single.image?.previewUrl || '/favicon.svg'" alt="商品图" />
        </div>
        <div class="insight-main">
          <div class="insight-kicker">
            <span class="dot"></span><span>IMAGE READ</span>
            <span v-if="categoryText" class="insight-category">{{ categoryText }}</span>
          </div>
          <h3 class="insight-title">{{ state.single.result.product?.name || '识别结果' }}</h3>
          <p v-if="state.single.result.product?.summary" class="insight-summary">{{ state.single.result.product.summary }}</p>
          <div v-if="attributes.length" class="insight-attrs">
            <span v-for="attribute in attributes" :key="attribute">{{ attribute }}</span>
          </div>
        </div>
        <div class="insight-side">
          <div class="score-ring" :style="{ '--value': `${Math.min(100, Math.max(0, state.single.result.overallScore || 0))}%` }">
            <div class="score-ring-inner"><strong>{{ state.single.result.overallScore || 0 }}</strong><small>综合</small></div>
          </div>
          <span class="score-label">标题综合分</span>
          <span v-if="typeof state.single.result.product?.confidence === 'number'" class="confidence">
            识别 {{ Math.round(state.single.result.product.confidence * 100) }}%
          </span>
        </div>
      </article>

      <div class="platform-tabs" role="tablist">
        <button
          v-for="platform in visiblePlatforms"
          :key="platform.id"
          type="button"
          class="tab"
          :class="{ 'is-active': state.single.activePlatform === platform.id }"
          @click="state.single.activePlatform = platform.id"
        >
          <span>{{ platform.short }}</span>
          <em>{{ state.single.result.platformCounts?.[platform.id] || 0 }}</em>
          <small>{{ platform.lang === 'en' ? `${platform.maxChars}c` : `${platform.maxChars}字` }}</small>
        </button>
      </div>

      <p class="list-meta">
        <strong>{{ currentPlatform?.name || '' }}</strong>
        <span class="sep"></span>
        <span>建议 ≤ {{ currentPlatform?.maxChars }} {{ currentPlatform?.lang === 'en' ? '字符' : '字' }}</span>
        <span class="sep"></span>
        <span>{{ selectedStrategyLabels || `${currentTitles.length} 条` }}</span>
      </p>

      <div class="title-list">
        <article
          v-for="(title, index) in currentTitles"
          :key="`${title.platform}-${title.strategy}-${index}`"
          class="title-card"
          :class="{ 'is-first': index === 0, 'is-en': currentPlatform?.lang === 'en' }"
          :title="title.reason || ''"
        >
          <div class="title-top">
            <span class="strategy-tag">{{ title.strategyLabel || '标题' }}</span>
            <span v-if="index === 0" class="first-badge"><el-icon><StarFilled /></el-icon>首选</span>
            <span v-if="title.reason" class="title-reason">{{ title.reason }}</span>
            <span class="title-score">综合 {{ title.score?.overall ?? '—' }}</span>
          </div>
          <p class="title-text">{{ title.text }}</p>
          <p v-if="title.translation" class="title-translation">
            {{ currentPlatform?.lang === 'en' ? '中文对照' : 'English' }}：{{ title.translation }}
          </p>
          <div class="title-foot">
            <span class="char-count" :class="{ 'is-near': title.chars / title.limit > 0.9, 'is-short': title.lengthOk === false }">
              {{ title.chars }} / {{ title.limit }} {{ currentPlatform?.lang === 'en' ? '字符' : '字' }}
            </span>
            <span class="char-meter" :class="{ 'is-near': title.chars / title.limit > 0.9 }"><i :style="{ width: `${Math.min(100, Math.max(2, (title.chars / title.limit) * 100))}%` }"></i></span>
            <span v-if="title.lengthOk === false" class="warning-tag">低于下限 {{ title.minChars }}</span>
            <span v-if="title.missingRequired?.length" class="warning-tag">缺必含词 {{ title.missingRequired.length }}</span>
            <span v-if="title.warnings?.length" class="warning-tag">含风险词 {{ title.warnings.length }}</span>
            <div class="title-actions">
              <button type="button" class="icon-action" title="复制标题" @click="copyText(title.text)">
                <el-icon><CopyDocument /></el-icon>
              </button>
            </div>
          </div>
        </article>
      </div>

      <section class="panel description-panel">
        <div class="panel-head"><h3>商品描述</h3><small>{{ descriptionMeta }}</small></div>
        <p v-if="state.single.result.description?.text" class="description-text">{{ state.single.result.description.text }}</p>
        <p v-else class="empty-note">这次没有生成商品描述，可以换一批或换一个模型。</p>
        <div v-if="state.single.result.description?.text" class="description-foot">
          <span class="description-count" :class="{ 'is-bad': state.single.result.description.ok === false }">
            {{ state.single.result.description.chars }} 字
          </span>
          <button type="button" class="description-copy" @click="copyText(state.single.result.description.text)">
            <el-icon><CopyDocument /></el-icon> 复制描述
          </button>
        </div>
      </section>

      <div class="result-lower">
        <section class="panel keywords-panel">
          <div class="panel-head"><h3>关键词库</h3><small>{{ keywordNote }}</small></div>
          <template v-if="keywordGroups.length">
            <div v-for="group in keywordGroups" :key="group.label" class="keyword-group">
              <div class="group-label">{{ group.label }}</div>
              <div class="keyword-chips">
                <button v-for="word in group.values" :key="word" type="button" class="keyword-chip" @click="copyText(word)">{{ word }}</button>
              </div>
            </div>
          </template>
          <p v-else class="empty-note">模型没有提取到关键词。</p>
        </section>

        <section class="panel compliance-panel">
          <div class="panel-head"><h3>合规与画质</h3><small>{{ currentPlatform?.short || '' }}</small></div>
          <div v-if="riskWords.length" class="risk-row">
            <span v-for="word in riskWords" :key="word" class="risk-tag">{{ word }}</span>
          </div>
          <ul class="compliance-list">
            <li v-for="note in complianceNotes" :key="note"><span class="dot"></span><span>{{ note }}</span></li>
          </ul>
          <div v-if="typeof state.single.result.imageQuality?.score === 'number'" class="quality-row">
            <span>画面 {{ state.single.result.imageQuality.score }}</span>
            <span class="quality-bar"><i :style="{ width: `${state.single.result.imageQuality.score}%` }"></i></span>
            <span>{{ state.single.result.imageQuality.score >= 85 ? '可用' : '建议重拍' }}</span>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import {
  state,
  currentPlatform,
  currentTitles,
  currentKeywords,
  platformShort,
  copyText,
  generateSingle,
  formatDuration,
} from '../store.js';

const resultTitle = computed(() => {
  if (state.single.busy) return '正在读图';
  if (state.single.error) return '生成没有完成';
  if (state.single.result) return '生成结果';
  return '等待一张商品图';
});

const resultSub = computed(() => {
  if (state.single.busy) return '识别主体、材质、结构与卖点，再按平台规则收敛标题。';
  if (state.single.error) return state.single.error.message;
  if (state.single.result) return `${state.single.result.titleCount || state.single.result.titles?.length || 0} 条标题 · ${state.single.result.product?.name || '商品'}${state.single.elapsedMs ? ` · 用时 ${formatDuration(state.single.elapsedMs)}` : ''}`;
  return '上传后约 15–40 秒，具体取决于模型速度。';
});

const loadingText = computed(() => ['正在读图…', '正在提取画面与材质…', '正在写标题…', '正在做平台校验…'][state.single.loadingStep] || '正在生成…');
const loadingTip = computed(() => state.single.loadingStep >= 2 ? '标题会按平台字数、禁用词与必含词收敛。' : '图片只发送到你配置的视觉模型服务。');

const categoryText = computed(() => {
  const product = state.single.result?.product || {};
  return product.category || (product.categoryPath || product.category_path || []).join(' / ');
});

const attributes = computed(() => (state.single.result?.product?.attributes || [])
  .map((attribute) => [attribute.name, attribute.value].filter(Boolean).join(' '))
  .filter(Boolean)
  .slice(0, 6));

const visiblePlatforms = computed(() => state.platforms.filter((platform) => state.selectedPlatforms.includes(platform.id)));

const selectedStrategyLabels = computed(() => state.selectedStrategies
  .map((id) => state.strategies.find((strategy) => strategy.id === id)?.label)
  .filter(Boolean)
  .join(' / '));

const descriptionMeta = computed(() => {
  const description = state.single.result?.description;
  return description?.text ? `${description.chars} / ${description.min}–${description.max} 字` : '模型未返回';
});

const keywordGroups = computed(() => {
  const keywords = currentKeywords.value;
  return [
    ['核心词', keywords?.core],
    ['长尾词', keywords?.long_tail],
    ['风格词', keywords?.emotion],
  ].filter(([, values]) => Array.isArray(values) && values.length)
    .map(([label, values]) => ({ label, values }));
});

const keywordNote = computed(() => {
  const english = currentPlatform.value?.lang === 'en';
  const primary = english ? state.single.result?.keywordsEn : state.single.result?.keywords;
  if (english && !(primary?.core || []).length) return '英文关键词缺失，以下为中文参考';
  return `${english ? 'EN' : '中文'} · 点击复制`;
});

const riskWords = computed(() => (state.single.result?.compliance?.forbidden || [])
  .filter((item) => item?.term)
  .slice(0, 8)
  .map((item) => item.term));

const complianceNotes = computed(() => {
  const notes = [...(state.single.result?.compliance?.notes || [])];
  if (!notes.length && !riskWords.value.length) notes.push('未发现常见极限词；成分、认证与功效仍需与实物一致。');
  if (currentPlatform.value?.hint) notes.push(`平台提醒：${currentPlatform.value.hint}。`);
  return notes.slice(0, 4);
});
</script>

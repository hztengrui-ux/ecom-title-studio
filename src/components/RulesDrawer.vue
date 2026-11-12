<template>
  <el-drawer v-model="visible" title="生成规则" size="470px" class="rules-drawer" destroy-on-close>
    <div class="drawer-lead">
      <span class="eyebrow">GENERATION RULES</span>
      <p>
        下限是<strong>质量兜底</strong>，不是平台要求：批量生成时拦住过短的标题；
        区间留得越宽，模型越自由，单张模式也不会被强行凑字。
      </p>
    </div>

    <div class="rule-summary">
      <span>中文 {{ draft.titleMinZh }}–{{ draft.titleMaxZh }} 字</span>
      <span>英文 {{ draft.titleMinEn }}–{{ draft.titleMaxEn }} 字符</span>
      <span>描述 {{ draft.descriptionMin }}–{{ draft.descriptionMax }} 字</span>
      <span>关键词 {{ draft.keywordMin }}–{{ draft.keywordMax }} 个</span>
    </div>

    <div class="rule-groups">
      <section class="rule-block">
        <div class="rule-block-head">
          <h4>标题</h4>
          <span>下限避免只剩品类词，上限对齐平台硬限</span>
        </div>
        <div class="rule-range">
          <span class="rule-range-label">中文</span>
          <el-input-number v-model="draft.titleMinZh" :min="guide.titleZh.min" :max="guide.titleZh.max" size="small" />
          <span class="rule-dash">–</span>
          <el-input-number v-model="draft.titleMaxZh" :min="guide.titleZh.min" :max="guide.titleZh.max" size="small" />
          <span class="rule-unit">字</span>
          <span v-if="draft.titleMinZh < guide.titleZh.recommendedMin" class="rule-recommend">低于推荐 {{ guide.titleZh.recommendedMin }} 字</span>
        </div>
        <div class="rule-range">
          <span class="rule-range-label">英文</span>
          <el-input-number v-model="draft.titleMinEn" :min="guide.titleEn.min" :max="guide.titleEn.max" size="small" />
          <span class="rule-dash">–</span>
          <el-input-number v-model="draft.titleMaxEn" :min="guide.titleEn.min" :max="guide.titleEn.max" size="small" />
          <span class="rule-unit">字符</span>
          <span v-if="draft.titleMinEn < guide.titleEn.recommendedMin" class="rule-recommend">低于推荐 {{ guide.titleEn.recommendedMin }} 字符</span>
        </div>
        <p class="rule-explain">{{ guide.titleZh.note }}；{{ guide.titleEn.note }}。</p>
        <p v-if="warnTitles" class="rule-warn">下限必须小于上限，保存时会自动校正。</p>
      </section>

      <section class="rule-block">
        <div class="rule-block-head">
          <h4>描述</h4>
          <span>写清材质、结构、场景与真实卖点，不夸大</span>
        </div>
        <div class="rule-range">
          <span class="rule-range-label">字数</span>
          <el-input-number v-model="draft.descriptionMin" :min="guide.description.min" :max="guide.description.max" size="small" />
          <span class="rule-dash">–</span>
          <el-input-number v-model="draft.descriptionMax" :min="guide.description.min" :max="guide.description.max" size="small" />
          <span class="rule-unit">字</span>
          <span v-if="draft.descriptionMin < guide.description.recommendedMin" class="rule-recommend">低于推荐 {{ guide.description.recommendedMin }} 字</span>
        </div>
        <p class="rule-explain">{{ guide.description.note }}。</p>
        <p v-if="descriptionGap < 30" class="rule-warn">区间偏窄：上下限只差 {{ descriptionGap }} 字，批量生成容易为凑字注水，建议至少留 30 字空间。</p>
        <p v-if="warnDescription" class="rule-warn">下限必须小于上限，保存时会自动校正。</p>
      </section>

      <section class="rule-block">
        <div class="rule-block-head">
          <h4>关键词</h4>
          <span>核心词决定覆盖，长尾词由模型补充</span>
        </div>
        <div class="rule-range">
          <span class="rule-range-label">数量</span>
          <el-input-number v-model="draft.keywordMin" :min="guide.keywords.min" :max="guide.keywords.max" size="small" />
          <span class="rule-dash">–</span>
          <el-input-number v-model="draft.keywordMax" :min="guide.keywords.min" :max="guide.keywords.max" size="small" />
          <span class="rule-unit">个</span>
          <span v-if="draft.keywordMin < guide.keywords.recommendedMin" class="rule-recommend">低于推荐 {{ guide.keywords.recommendedMin }} 个</span>
        </div>
        <p class="rule-explain">{{ guide.keywords.note }}。</p>
        <p v-if="warnKeywords" class="rule-warn">下限必须小于上限，保存时会自动校正。</p>
      </section>

      <section class="rule-block">
        <div class="rule-block-head">
          <h4>图片</h4>
          <span>尺寸越小上传越快，1280 px 已够识别细节</span>
        </div>
        <div class="rule-pair">
          <label class="field">
            <span>目标尺寸</span>
            <el-select v-model="draft.imageMaxEdge" size="small">
              <el-option v-for="n in [548, 640, 768, 1024, 1280, 1600, 2048]" :key="n" :label="`${n} px`" :value="n" />
            </el-select>
          </label>
          <label class="field">
            <span>缩放方式</span>
            <el-select v-model="draft.imageResizeMode" size="small">
              <el-option label="按宽度等比" value="width" />
              <el-option label="按最长边" value="longest" />
            </el-select>
          </label>
        </div>
      </section>

      <el-collapse v-model="advancedOpen" class="rule-advanced">
        <el-collapse-item name="advanced">
          <template #title>
            <span class="rule-advanced-title">
              高级规则
              <em v-if="advancedCount">{{ advancedCount }} 项已设置</em>
            </span>
          </template>
          <label class="field">
            <span>固定标题前缀 <em>始终保留在标题开头</em></span>
            <el-input v-model="draft.titlePrefix" maxlength="60" placeholder="例如：女士秋冬新款简约百搭开衫毛衣" />
          </label>
          <label class="field">
            <span>固定标题后缀 <em>始终保留在标题结尾</em></span>
            <el-input v-model="draft.titleSuffix" maxlength="80" placeholder="例如：宽松休闲长袖针织上衣，通勤日常内搭外穿皆可" />
          </label>
          <label class="field">
            <span>必含词 <em>一行一个</em></span>
            <el-input v-model="mustText" type="textarea" :rows="2" placeholder="例如：圣诞&#10;针织" />
          </label>
          <label class="field">
            <span>禁用词 <em>一行一个</em></span>
            <el-input v-model="bannedText" type="textarea" :rows="2" placeholder="例如：全网最低&#10;绝对安全" />
          </label>
          <label class="field">
            <span>关键词组合 <em>一行一组，逗号分隔</em></span>
            <el-input v-model="comboText" type="textarea" :rows="2" placeholder="例如：圣诞,老人,驯鹿" />
          </label>
          <label class="field">
            <span>批量并发</span>
            <select :value="concurrencyValue" class="rule-native-select" @change="onConcurrency">
              <option value="auto">自动（推荐 {{ recommendedConcurrency() }} 张/次）</option>
              <option v-for="n in 20" :key="n" :value="String(n)">{{ n }} 张 / 次</option>
            </select>
          </label>
          <p class="provider-hint">自动模式根据 CPU 与内存推荐 2–10；手动可选 1–20。</p>
        </el-collapse-item>
      </el-collapse>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="resetDefaults">恢复推荐值</el-button>
        <el-button type="primary" @click="save">保存规则</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { state, setRules, toast, recommendedConcurrency } from '../store.js';
import { DEFAULT_RULES, RULE_GUIDE, normalizeRules } from '../../lib/rules.mjs';

const guide = RULE_GUIDE;
const visible = computed({
  get: () => state.ui.rules,
  set: (value) => { state.ui.rules = value; },
});
const draft = reactive({ ...DEFAULT_RULES });
const mustText = ref('');
const bannedText = ref('');
const comboText = ref('');
const concurrencyValue = ref('auto');
const advancedOpen = ref([]);

const warnTitles = computed(() => draft.titleMinZh >= draft.titleMaxZh || draft.titleMinEn >= draft.titleMaxEn);
const warnDescription = computed(() => draft.descriptionMin >= draft.descriptionMax);
const descriptionGap = computed(() => Math.max(0, Number(draft.descriptionMax) - Number(draft.descriptionMin)));
const warnKeywords = computed(() => draft.keywordMin >= draft.keywordMax);
const advancedCount = computed(() => {
  let count = 0;
  if (draft.titlePrefix) count += 1;
  if (draft.titleSuffix) count += 1;
  if (mustText.value.trim()) count += 1;
  if (bannedText.value.trim()) count += 1;
  if (comboText.value.trim()) count += 1;
  if (concurrencyValue.value !== 'auto') count += 1;
  return count;
});

watch(visible, (open) => {
  if (!open) return;
  Object.assign(draft, state.rules, {
    mustInclude: [...state.rules.mustInclude],
    bannedWords: [...state.rules.bannedWords],
    keywordCombos: [...state.rules.keywordCombos],
  });
  mustText.value = state.rules.mustInclude.join('\n');
  bannedText.value = state.rules.bannedWords.join('\n');
  comboText.value = state.rules.keywordCombos.join('\n');
  concurrencyValue.value = state.rules.concurrencyMode === 'auto' ? 'auto' : String(state.rules.concurrency);
  advancedOpen.value = advancedCount.value ? ['advanced'] : [];
});

function onConcurrency(event) {
  concurrencyValue.value = event.target.value;
}

function save() {
  const payload = {
    titleMinZh: draft.titleMinZh,
    titleMaxZh: draft.titleMaxZh,
    titleMinEn: draft.titleMinEn,
    titleMaxEn: draft.titleMaxEn,
    descriptionMin: draft.descriptionMin,
    descriptionMax: draft.descriptionMax,
    keywordMin: draft.keywordMin,
    keywordMax: draft.keywordMax,
    titlePrefix: draft.titlePrefix,
    titleSuffix: draft.titleSuffix,
    imageMaxEdge: draft.imageMaxEdge,
    imageResizeMode: draft.imageResizeMode,
    mustInclude: mustText.value.split(/\n|,|，|、|;/).map((item) => item.trim()).filter(Boolean),
    bannedWords: bannedText.value.split(/\n|,|，|、|;/).map((item) => item.trim()).filter(Boolean),
    keywordCombos: comboText.value.split(/\n|,|，|、|;/).map((item) => item.trim()).filter(Boolean),
    concurrencyMode: concurrencyValue.value === 'auto' ? 'auto' : 'manual',
    concurrency: concurrencyValue.value === 'auto' ? recommendedConcurrency() : Number(concurrencyValue.value),
  };
  const normalized = normalizeRules({ ...state.rules, ...payload });
  const corrected = warnTitles.value || warnDescription.value || warnKeywords.value;
  setRules(payload);
  toast(corrected ? `规则已保存，区间已自动校正为 中文 ${normalized.titleMinZh}–${normalized.titleMaxZh} 字 / 描述 ${normalized.descriptionMin}–${normalized.descriptionMax} 字` : '生成规则已保存', 'success');
  state.ui.rules = false;
}

function resetDefaults() {
  Object.assign(draft, DEFAULT_RULES, { mustInclude: [], bannedWords: [], keywordCombos: [] });
  mustText.value = '';
  bannedText.value = '';
  comboText.value = '';
  concurrencyValue.value = 'auto';
}
</script>

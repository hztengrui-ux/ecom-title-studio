<template>
  <el-drawer v-model="visible" title="模型设置" size="460px" class="settings-drawer" destroy-on-close>
    <div class="drawer-lead">
      <span class="eyebrow">VISION MODEL</span>
      <p>图片只发送到你配置的视觉模型服务，不经过第三方中转。</p>
    </div>

    <div class="preset-grid">
      <button
        v-for="preset in PRESETS"
        :key="preset.id"
        type="button"
        class="preset-card"
        :class="{ 'is-active': state.settings.provider === preset.id }"
        @click="choosePreset(preset)"
      >
        <strong>{{ preset.name }}</strong>
        <small>{{ preset.note }}</small>
      </button>
    </div>

    <div class="settings-form">
      <label class="field">
        <span>接口地址 Base URL</span>
        <el-input v-model="state.settings.baseUrl" placeholder="https://.../v1" :disabled="state.settings.provider === 'demo'" />
      </label>
      <label class="field">
        <span>模型名称</span>
        <el-input v-model="state.settings.model" placeholder="模型 ID" :disabled="state.settings.provider === 'demo'" />
      </label>
      <label class="field">
        <span>API Key <em>只保存在本机</em></span>
        <div class="key-row">
          <el-input v-model="state.settings.apiKey" :type="showKey ? 'text' : 'password'" placeholder="sk-..." :disabled="state.settings.provider === 'demo'" />
          <button type="button" class="key-toggle" @click="showKey = !showKey">{{ showKey ? '隐藏' : '显示' }}</button>
        </div>
      </label>
      <div class="field">
        <span>温度 <em>{{ Number(state.settings.temperature).toFixed(1) }}</em></span>
        <el-slider v-model="state.settings.temperature" :min="0" :max="1.5" :step="0.1" />
      </div>
      <p v-if="hint" class="provider-hint">{{ hint }}</p>
      <p v-if="state.settings.provider === 'demo'" class="provider-hint">演示模式只识别内置示例图；要识别自己的图片，请选一个视觉模型并填写 API Key。</p>
      <p class="provider-hint">设置和 API Key 会自动保存在本机；关闭软件再打开仍会保留，不需要每次重新绑定。</p>
    </div>

    <div v-if="testMessage" class="test-result" :class="{ 'is-error': testError }">{{ testMessage }}</div>

    <template #footer>
      <div class="drawer-footer">
        <el-button :loading="testing" @click="testConnection">测试连接</el-button>
        <div>
          <el-button @click="useDemo">演示模式</el-button>
          <el-button type="primary" @click="save">保存设置</el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { state, PRESETS, PROVIDER_HINTS, persistSettings, isKeyOptional, toast } from '../store.js';
import { postJson } from '../api.js';

const visible = computed({
  get: () => state.ui.settings,
  set: (value) => { state.ui.settings = value; },
});
const showKey = ref(false);
const testing = ref(false);
const testMessage = ref('');
const testError = ref(false);
const hint = computed(() => PROVIDER_HINTS[state.settings.provider] || '');

function choosePreset(preset) {
  state.settings.provider = preset.id;
  state.settings.baseUrl = preset.baseUrl;
  state.settings.model = preset.model;
  testMessage.value = '';
  testError.value = false;
}
function useDemo() {
  choosePreset(PRESETS[0]);
  persistSettings();
  toast('已切换到演示模式', 'success');
}
function save() {
  if (state.settings.provider !== 'demo') {
    if (!state.settings.baseUrl || !state.settings.model) {
      toast('请填写接口地址和模型名称', 'error');
      return;
    }
    if (!state.settings.apiKey && !isKeyOptional(state.settings.baseUrl)) {
      toast('请填写 API Key', 'error');
      return;
    }
  }
  persistSettings();
  toast('模型设置已保存', 'success');
  state.ui.settings = false;
}
async function testConnection() {
  testing.value = true;
  testMessage.value = '';
  testError.value = false;
  try {
    const data = await postJson('/api/test', {
      settings: {
        provider: state.settings.provider,
        baseUrl: state.settings.baseUrl,
        model: state.settings.model,
        apiKey: state.settings.apiKey,
        temperature: state.settings.temperature,
      },
    }, 30000);
    testMessage.value = data?.model ? `连接成功 · ${data.model}` : '连接成功';
    toast('连接成功', 'success');
  } catch (error) {
    testError.value = true;
    testMessage.value = error.message || '连接失败';
  } finally {
    testing.value = false;
  }
}
</script>

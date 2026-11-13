<template>
  <div class="login-shell">
    <div class="login-bg" aria-hidden="true">
      <span class="login-orb login-orb-a"></span>
      <span class="login-orb login-orb-b"></span>
    </div>

    <section class="login-card" aria-label="登录跨多多标题工坊">
      <header class="login-brand">
        <span class="login-glyph">题</span>
        <div class="login-brand-text">
          <strong>跨多多标题工坊</strong>
          <span>KUADUO TITLE WORKSHOP</span>
        </div>
      </header>

      <h1 class="login-title">登录你的工作账号</h1>
      <p class="login-sub">账号由跨多多统一开通，到期或停用后无法继续使用。</p>

      <form class="login-form" @submit.prevent="submit">
        <label class="login-field">
          <span>账号</span>
          <el-input
            v-model="form.username"
            size="large"
            autocomplete="username"
            placeholder="例如 client01"
            :disabled="auth.loggingIn"
            @keyup.enter="submit"
          />
        </label>

        <label class="login-field">
          <span>密码</span>
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            show-password
            autocomplete="current-password"
            placeholder="请输入密码"
            :disabled="auth.loggingIn"
            @keyup.enter="submit"
          />
        </label>

        <p v-if="auth.error" class="login-error" role="alert">{{ auth.error }}</p>
        <p v-else-if="auth.offline" class="login-warn">网络不稳定：登录状态将保留，稍后会自动重新校验。</p>

        <el-button class="login-submit" type="primary" size="large" :loading="auth.loggingIn" native-type="submit">
          {{ auth.loggingIn ? '正在登录…' : '登 录' }}
        </el-button>
      </form>

      <footer class="login-foot">
        <span class="login-dot" aria-hidden="true"></span>
        <span>授权服务 {{ authBaseLabel }}</span>
        <span class="login-sep" aria-hidden="true">·</span>
        <span>遇到问题请联系跨多多管理员</span>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue';
import { auth, login } from '../auth.js';
import { getJson } from '../api.js';

const form = reactive({ username: '', password: '' });
const baseUrl = reactive({ value: '' });

const authBaseLabel = computed(() => baseUrl.value || 'api.kuaduoduo.vip');

onMounted(async () => {
  try {
    const data = await getJson('/api/auth/config', 8000);
    if (data?.baseUrl) baseUrl.value = String(data.baseUrl).replace(/^https?:\/\//, '');
  } catch {
    // 配置读取失败不影响登录尝试
  }
});

async function submit() {
  if (auth.loggingIn) return;
  const username = form.username.trim();
  const password = form.password;
  if (!username || !password) {
    auth.error = '请输入账号和密码';
    return;
  }
  try {
    await login(username, password);
    form.password = '';
  } catch (error) {
    auth.error = String(error?.message || '登录失败，请稍后再试');
  }
}
</script>

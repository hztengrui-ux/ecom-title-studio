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

      <div class="login-tabs" role="tablist" aria-label="登录方式">
        <button
          type="button"
          class="login-tab"
          :class="{ 'is-active': mode === 'password' }"
          role="tab"
          :aria-selected="mode === 'password'"
          @click="switchMode('password')"
        >
          账号密码
        </button>
        <button
          type="button"
          class="login-tab"
          :class="{ 'is-active': mode === 'code' }"
          role="tab"
          :aria-selected="mode === 'code'"
          @click="switchMode('code')"
        >
          登录码登录
        </button>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label class="login-field">
          <span>{{ mode === 'code' ? '账号 / 手机号' : '账号' }}</span>
          <el-input
            v-model="form.username"
            size="large"
            autocomplete="username"
            :placeholder="mode === 'code' ? '例如 13800138000' : '例如 client01'"
            :disabled="auth.loggingIn"
            @keyup.enter="submit"
          />
        </label>

        <label v-if="mode === 'password'" class="login-field">
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

        <label v-else class="login-field">
          <span>登录码</span>
          <el-input
            v-model="form.code"
            size="large"
            maxlength="6"
            autocomplete="one-time-code"
            inputmode="numeric"
            placeholder="6 位登录码（10 分钟内有效）"
            :disabled="auth.loggingIn"
            @keyup.enter="submit"
          />
        </label>

        <p v-if="auth.error" class="login-error" role="alert">{{ auth.error }}</p>
        <p v-else-if="auth.offline" class="login-warn">网络不稳定：登录状态将保留，稍后会自动重新校验。</p>

        <p v-if="mode === 'code'" class="login-hint">
          登录码由管理员在后台生成，一次有效。没有的话请让管理员在「账号授权管理」里点「生成登录码」。
        </p>

        <el-button class="login-submit" type="primary" size="large" :loading="auth.loggingIn" native-type="submit">
          {{ auth.loggingIn ? '正在登录…' : '登 录' }}
        </el-button>
      </form>

      <footer class="login-foot">
        <span class="login-dot" aria-hidden="true"></span>
        <span>服务号码 <strong class="login-phone">13221506699</strong></span>
        <span class="login-sep" aria-hidden="true">·</span>
        <span>遇到问题请联系跨多多管理员</span>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { auth, login, loginWithCode } from '../auth.js';

const mode = ref('password');
const form = reactive({ username: '', password: '', code: '' });

function switchMode(next) {
  if (auth.loggingIn) return;
  mode.value = next;
  auth.error = '';
}

async function submit() {
  if (auth.loggingIn) return;
  const username = form.username.trim();
  if (!username) {
    auth.error = '请输入账号';
    return;
  }
  try {
    if (mode.value === 'code') {
      const code = form.code.trim();
      if (!/^\d{6}$/.test(code)) {
        auth.error = '请输入 6 位数字登录码';
        return;
      }
      await loginWithCode(username, code);
      form.code = '';
    } else {
      const password = form.password;
      if (!password) {
        auth.error = '请输入密码';
        return;
      }
      await login(username, password);
      form.password = '';
    }
  } catch (error) {
    auth.error = String(error?.message || '登录失败，请稍后再试');
  }
}
</script>


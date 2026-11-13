<template>
  <LoginView v-if="auth.ready && !auth.token" />
  <div v-else class="app" :class="`mode-${state.mode}`">
    <aside class="rail" aria-label="主导航">
      <a class="brand" href="#" aria-label="跨多多标题工坊首页" @click.prevent="setMode('single')">
        <span class="brand-glyph">题</span>
        <span class="brand-word">KUADUO<br />TITLE</span>
      </a>

      <nav class="rail-nav">
        <button type="button" class="rail-item" :class="{ 'is-active': state.mode === 'single' }" @click="setMode('single')">
          <el-icon><Grid /></el-icon><span>工作台</span>
        </button>
        <button type="button" class="rail-item" :class="{ 'is-active': state.ui.history }" @click="state.ui.history = true">
          <el-icon><Clock /></el-icon><span>历史</span>
        </button>
      </nav>

      <div class="rail-foot">
        <button type="button" class="rail-item" @click="state.ui.help = true">
          <el-icon><InfoFilled /></el-icon><span>说明</span>
        </button>
        <button type="button" class="rail-item" @click="state.ui.settings = true">
          <el-icon><Setting /></el-icon><span>设置</span>
        </button>
        <div class="rail-avatar" title="本地工作台">TW</div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="crumbs">
          <a class="topbar-brand" href="#" aria-label="跨多多标题工坊" @click.prevent="setMode('single')">
            <span class="topbar-brand-glyph">题</span>
          </a>
          <span class="crumb-root">跨多多标题工坊</span>
          <el-icon class="crumb-arrow"><ArrowRight /></el-icon>
          <strong>{{ state.mode === 'batch' ? '批量任务' : '新建任务' }}</strong>
        </div>

        <div class="topbar-right">
          <el-dropdown v-if="auth.account" trigger="click" @command="handleAccount">
            <button type="button" class="account-chip" :class="{ 'is-offline': auth.offline }" :title="accountTitle">
              <span class="account-dot" aria-hidden="true"></span>
              <span class="account-name">{{ accountLabel() }}</span>
              <span class="account-days">{{ daysLeft() === null ? '—' : `剩 ${daysLeft()} 天` }}</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="recheck">重新校验授权</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <button type="button" class="model-pill" :data-tone="state.settings.provider === 'demo' ? 'demo' : 'live'" @click="state.ui.settings = true">
            <i aria-hidden="true"></i>
            <span>{{ modelLabel }}</span>
          </button>
          <span class="topbar-sep" aria-hidden="true"></span>
          <button type="button" class="icon-btn" aria-label="打开模型设置" @click="state.ui.settings = true">
            <el-icon><Setting /></el-icon>
          </button>
          <span class="topbar-sep" aria-hidden="true"></span>
          <el-dropdown trigger="click" @command="handleMenu">
            <button type="button" class="top-menu-trigger">文件</button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="open-output">打开输出文件夹</el-dropdown-item>
                <el-dropdown-item command="open-data">打开应用数据文件夹</el-dropdown-item>
                <el-dropdown-item divided command="quit">退出</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click" @command="handleMenu">
            <button type="button" class="top-menu-trigger">编辑</button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="undo">撤销</el-dropdown-item>
                <el-dropdown-item command="redo">重做</el-dropdown-item>
                <el-dropdown-item divided command="copy">复制</el-dropdown-item>
                <el-dropdown-item command="paste">粘贴</el-dropdown-item>
                <el-dropdown-item command="select-all">全选</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click" @command="handleMenu">
            <button type="button" class="top-menu-trigger">视图</button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="reload">重新加载</el-dropdown-item>
                <el-dropdown-item divided command="reset-zoom">实际大小</el-dropdown-item>
                <el-dropdown-item command="zoom-in">放大</el-dropdown-item>
                <el-dropdown-item command="zoom-out">缩小</el-dropdown-item>
                <el-dropdown-item divided command="fullscreen">全屏</el-dropdown-item>
                <el-dropdown-item command="devtools">开发者工具</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click" @command="handleMenu">
            <button type="button" class="top-menu-trigger">帮助</button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="about">关于跨多多标题工坊</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <SingleWorkspace v-if="state.mode === 'single'" />
      <BatchWorkspace v-else />

      <div v-if="!state.ready" class="app-loading">
        <span class="loading-orbit"></span>
        <p>正在载入工作台…</p>
      </div>
    </main>

    <SettingsDrawer />
    <RulesDrawer />
    <HistoryDrawer />
    <HelpDialog />
    <PreviewDialog />
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { state, loadMeta } from './store.js';
import {
  auth,
  loadAuth,
  refresh,
  logout,
  daysLeft,
  accountLabel,
  startAuthWatch,
  stopAuthWatch,
} from './auth.js';
import LoginView from './components/LoginView.vue';
import SingleWorkspace from './components/SingleWorkspace.vue';
import BatchWorkspace from './components/BatchWorkspace.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
import RulesDrawer from './components/RulesDrawer.vue';
import HistoryDrawer from './components/HistoryDrawer.vue';
import HelpDialog from './components/HelpDialog.vue';
import PreviewDialog from './components/PreviewDialog.vue';

const modelLabel = computed(() => {
  if (state.settings.provider === 'demo') return '演示模式';
  return state.settings.model || '未配置模型';
});

const accountTitle = computed(() => {
  if (!auth.account) return '';
  const expire = auth.account.expiresAt
    ? new Date(auth.account.expiresAt).toLocaleDateString('zh-CN')
    : '—';
  return `账号 ${auth.account.username} · 到期 ${expire}`;
});

function setMode(mode) {
  state.mode = mode;
}

async function handleMenu(command) {
  if (!window.desktop?.menuAction) return;
  try {
    await window.desktop.menuAction(command);
  } catch {
    // native menu errors already surface via Electron
  }
}

async function handleAccount(command) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('退出后需要重新输入账号密码，确定退出？', '退出登录', {
        confirmButtonText: '退出登录',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch {
      return;
    }
    stopAuthWatch();
    logout();
    ElMessage.success('已退出登录');
    return;
  }
  if (command === 'recheck') {
    const result = await refresh();
    if (result.ok) ElMessage.success('授权有效，已刷新');
    else if (result.reason === 'denied') ElMessage.error(result.message || '登录已失效');
    else ElMessage.warning('暂时连不上授权服务器，稍后自动重试');
  }
}

onMounted(async () => {
  await loadMeta();
  loadAuth();
  if (!auth.token) return;
  const result = await refresh();
  if (result.ok) {
    startAuthWatch((message) => {
      ElMessage.error(message || '登录已失效，请重新登录');
    });
    return;
  }
  if (result.reason === 'denied') {
    auth.error = result.message || '登录已失效，请重新登录';
    return;
  }
  // 网络异常：保留登录态但提示离线，后续 30 分钟校验会自动恢复
  ElMessage.warning('暂时连不上授权服务器，已进入离线模式，稍后自动重试');
  startAuthWatch((message) => {
    ElMessage.error(message || '登录已失效，请重新登录');
  });
});

onBeforeUnmount(stopAuthWatch);
</script>

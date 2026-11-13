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
        <button v-if="update.hasUpdate" type="button" class="rail-item rail-update" @click="openUpdateDialog">
          <el-icon><Download /></el-icon><span>更新</span>
          <i class="rail-update-dot" aria-hidden="true"></i>
        </button>
        <button type="button" class="rail-item" @click="state.ui.help = true">
          <el-icon><InfoFilled /></el-icon><span>说明</span>
        </button>
        <button type="button" class="rail-item" @click="state.ui.settings = true">
          <el-icon><Setting /></el-icon><span>设置</span>
        </button>
        <el-dropdown v-if="auth.account" trigger="click" placement="right-end" @command="handleAccount">
          <button type="button" class="rail-account" :class="{ 'is-offline': auth.offline }" :title="accountTitle">
            <span class="rail-account-avatar">{{ accountInitial }}</span>
            <span class="rail-account-name">{{ auth.account.name || auth.account.username }}</span>
            <span class="rail-account-days">{{ daysLeft() === null ? '—' : daysLeft() + ' 天' }}</span>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="recheck">重新校验授权</el-dropdown-item>
              <el-dropdown-item v-if="update.hasUpdate" command="update" divided>发现新版本 {{ update.latest }}</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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

    <el-dialog v-model="updateDialog" title="发现新版本" width="430px" append-to-body align-center>
      <div class="update-body">
        <p class="update-line">当前版本 <strong>{{ update.current }}</strong> → 最新版本 <strong>{{ update.latest }}</strong></p>
        <p v-if="update.notes" class="update-notes">{{ update.notes }}</p>
        <p class="update-tip">点击「打开下载页」下载最新安装包，解压覆盖原程序即可；设置、历史和登录状态都会保留。</p>
      </div>
      <template #footer>
        <el-button @click="dismissUpdate">稍后提醒</el-button>
        <el-button type="primary" @click="downloadUpdate">打开下载页</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getJson } from './api.js';
import { state, loadMeta } from './store.js';
import {
  auth,
  loadAuth,
  refresh,
  logout,
  daysLeft,
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

const accountInitial = computed(() => {
  const label = auth.account?.name || auth.account?.username || '客';
  return String(label).trim().slice(0, 1).toUpperCase();
});

// ---- 在线更新 ----
const UPDATE_DISMISS_KEY = 'tw.update.dismissed';
const update = reactive({ current: '', latest: '', notes: '', url: '', hasUpdate: false });
const updateDialog = ref(false);

async function checkUpdate() {
  try {
    const data = await getJson('/api/update/check', 12000);
    if (!data?.ok) return;
    update.current = data.current || '';
    update.latest = data.latest || '';
    update.notes = data.notes || '';
    update.url = data.url || '';
    update.hasUpdate = Boolean(data.hasUpdate);
    if (update.hasUpdate && localStorage.getItem(UPDATE_DISMISS_KEY) !== update.latest) {
      updateDialog.value = true;
    }
  } catch {
    // 更新检查失败不影响使用
  }
}

function openUpdateDialog() {
  updateDialog.value = true;
}

function dismissUpdate() {
  if (update.latest) localStorage.setItem(UPDATE_DISMISS_KEY, update.latest);
  updateDialog.value = false;
}

async function downloadUpdate() {
  const url = update.url || 'https://github.com/hztengrui-ux/ecom-title-studio/releases/latest';
  try {
    if (window.desktop?.openExternal) await window.desktop.openExternal(url);
    else window.open(url, '_blank');
  } finally {
    updateDialog.value = false;
  }
}

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
  if (command === 'update') {
    openUpdateDialog();
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
    beginAuthWatch();
    return;
  }
  if (result.reason === 'denied') {
    auth.error = result.message || '登录已失效，请重新登录';
    return;
  }
// 网络异常：保留登录态但提示离线，后续 30 分钟校验会自动恢复
  ElMessage.warning('暂时连不上授权服务器，已进入离线模式，稍后自动重试');
  beginAuthWatch();
});

let updateTimer = null;

async function recheckNow() {
  if (!auth.token) return;
  const result = await refresh();
  if (!result.ok && result.reason === 'denied') {
    ElMessage.error(result.message || '登录已失效，请重新登录');
  }
}

function onWindowVisible() {
  if (document.visibilityState === 'visible') recheckNow();
}

onMounted(() => {
  window.addEventListener('focus', recheckNow);
  document.addEventListener('visibilitychange', onWindowVisible);
  checkUpdate();
  updateTimer = setInterval(checkUpdate, 4 * 60 * 60 * 1000);
});

function beginAuthWatch() {
  startAuthWatch((message) => {
    ElMessage.error(message || '登录已失效，请重新登录');
  });
}

watch(
  () => auth.token,
  async (token) => {
    if (!token) {
      update.hasUpdate = false;
      stopAuthWatch();
      return;
    }
    const result = await refresh();
    if (result.ok) beginAuthWatch();
    else if (result.reason === 'denied') {
      ElMessage.error(result.message || '登录已失效，请重新登录');
    } else {
      beginAuthWatch();
    }
  },
);

onBeforeUnmount(() => {
  stopAuthWatch();
  if (updateTimer) clearInterval(updateTimer);
  window.removeEventListener('focus', recheckNow);
  document.removeEventListener('visibilitychange', onWindowVisible);
});
</script>





<template>
  <div class="app" :class="`mode-${state.mode}`">
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
import { computed, onMounted } from 'vue';
import { state, loadMeta } from './store.js';
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

onMounted(loadMeta);
</script>

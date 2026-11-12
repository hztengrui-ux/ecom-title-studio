<template>
  <el-drawer v-model="visible" title="最近生成" size="400px" class="history-drawer" destroy-on-close>
    <div class="drawer-lead">
      <span class="eyebrow">RECENT HISTORY</span>
      <p>只保存在本机，最多保留 8 条。</p>
    </div>

    <div v-if="!state.history.length" class="history-empty">
      <el-icon><Clock /></el-icon>
      <p>还没有生成记录。<br />完成一次生成后，结果会保存在这里。</p>
    </div>

    <div v-else class="history-list">
      <article
        v-for="entry in state.history"
        :key="entry.id"
        class="history-item"
        role="button"
        tabindex="0"
        @click="openHistory(entry)"
        @keydown.enter="openHistory(entry)"
      >
        <div class="history-thumb"><img :src="entry.thumb || '/favicon.svg'" :alt="entry.name" /></div>
        <div class="history-main">
          <div class="history-title">{{ entry.name }}</div>
          <div class="history-meta">
            <span>{{ formatDate(entry.at) }}</span>
            <em>{{ entry.result?.titles?.length || 0 }} 条</em>
          </div>
        </div>
        <button type="button" class="history-delete" title="删除" @click.stop="removeEntry(entry)">×</button>
      </article>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <el-button :disabled="!state.history.length" @click="clearHistory">清空历史</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue';
import { state, openHistory, clearHistory, formatDate, toast } from '../store.js';

const visible = computed({
  get: () => state.ui.history,
  set: (value) => { state.ui.history = value; },
});
function removeEntry(entry) {
  state.history = state.history.filter((item) => item.id !== entry.id);
  try {
    localStorage.setItem('tw.history.v1', JSON.stringify(state.history));
  } catch {
    // ignore
  }
  toast('已删除这条记录');
}
</script>

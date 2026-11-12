<template>
  <el-dialog v-model="visible" title="使用说明" width="620px" class="help-dialog">
    <div class="help-body">
      <span class="eyebrow">HOW IT WORKS</span>
      <h3>一张商品图，生成可直接上架的标题</h3>
      <p>本工具由你的浏览器/桌面端调用视觉模型识别图片，再按平台规则收敛标题、描述与关键词。图片只发送到你配置的模型接口。</p>

      <div class="help-grid">
        <div><b>01</b><strong>上传图片</strong><span>单张拖入或批量选择文件夹，支持 JPG / PNG / WebP。</span></div>
        <div><b>02</b><strong>选择平台</strong><span>可同时生成多个平台；每个平台按自己的字数与语气收敛。</span></div>
        <div><b>03</b><strong>勾选导出</strong><span>批量结果可逐条勾选，只导出选中的标题、图片与描述。</span></div>
      </div>

      <h4>演示模式</h4>
      <p>演示模式不需要 API Key，使用 4 张内置示例图；要识别自己的图片，请在右上角设置中配置视觉模型。</p>

      <h4>数据与隐私</h4>
      <p>API Key、设置与历史只保存在本机。批量导出默认保存到程序旁的 <code>KuaduoTitleWorkshop-data</code>，也可以在批量设置中指定位置。</p>

      <h4>常见问题</h4>
      <p>如果模型返回空内容，应用会自动降级重试一次；仍失败时查看错误卡片里的技术细节，确认接口地址、模型名称与图片输入能力。</p>
    </div>
    <template #footer>
      <el-button type="primary" @click="visible = false">开始使用</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { state } from '../store.js';

const visible = computed({
  get: () => state.ui.help,
  set: (value) => { state.ui.help = value; },
});
</script>

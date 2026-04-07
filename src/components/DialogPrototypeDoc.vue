<script setup lang="ts">
/**
 * 弹窗「原型说明」：与《页面 UI 规范》§2 弹窗原型说明一致。
 * - 标准用法：传 docKey → 读取 /docs/pages/dialogs/{docKey}.md
 * - 兼容页头级整页说明：传 docUrl → 读取任意 public 下路径
 */
import { computed, ref, watch } from 'vue';
import { Document } from '@element-plus/icons-vue';

const props = withDefaults(
  defineProps<{
    /** 对应 public/docs/pages/dialogs/{docKey}.md（不含路径与后缀） */
    docKey?: string;
    /** 完整路径，如 /docs/pages/policy-change-open.md；与 docKey 二选一 */
    docUrl?: string;
    /** 用于默认次级弹窗标题：「说明 — {businessShortName}」 */
    businessShortName: string;
    /** 覆盖次级弹窗标题（不传则「说明 — businessShortName」） */
    subDialogTitle?: string;
  }>(),
  {},
);

const resolvedUrl = computed(() => {
  if (props.docUrl) return props.docUrl;
  if (props.docKey) return `/docs/pages/dialogs/${props.docKey}.md`;
  return '';
});

const innerTitle = computed(
  () => props.subDialogTitle ?? `说明 — ${props.businessShortName}`,
);

const visible = ref(false);
const content = ref('');
const loading = ref(false);

async function loadDoc() {
  const url = resolvedUrl.value;
  if (!url) {
    content.value = '# 配置错误\n未配置 docKey 或 docUrl。';
    return;
  }
  content.value = '';
  loading.value = true;
  try {
    const res = await fetch(url);
    content.value = res.ok ? await res.text() : '# 暂无说明\n当前暂无原型说明文档。';
  } catch {
    content.value = '# 暂无说明\n当前暂无原型说明文档。';
  } finally {
    loading.value = false;
  }
}

function open() {
  visible.value = true;
}

watch(visible, (v) => {
  if (v) void loadDoc();
});
</script>

<template>
  <span class="dialog-prototype-doc">
    <ElTooltip content="原型说明" placement="bottom">
      <ElButton size="small" :icon="Document" circle aria-label="原型说明" @click="open" />
    </ElTooltip>
    <ElDialog
      v-model="visible"
      :title="innerTitle"
      width="640px"
      class="page-doc-dialog"
      append-to-body
    >
      <div v-loading="loading" class="page-doc-body">
        <pre class="page-doc-markdown">{{ content }}</pre>
      </div>
    </ElDialog>
  </span>
</template>

<style scoped>
.dialog-prototype-doc {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
</style>

<style>
.page-doc-dialog .page-doc-body {
  min-height: 120px;
  max-height: 70vh;
  overflow: auto;
}
.page-doc-dialog .page-doc-markdown {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--el-font-family);
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}
</style>

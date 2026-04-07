<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { InfoFilled, Setting, Document } from '@element-plus/icons-vue';
import PageHeader from '@/components/PageHeader.vue';
import PageContent from '@/components/PageContent.vue';
import PolicyAnalysisHeaderActions from '@/components/PolicyAnalysisHeaderActions.vue';

const route = useRoute();
const router = useRouter();
const pageDocVisible = ref(false);
const pageDocContent = ref('');
const pageDocLoading = ref(false);

const docPath = computed(() => {
  const path = route.path.replace(/^\//, '') || 'policy-analysis';
  return `/docs/pages/${path}.md`;
});

const isSecurityPolicy = computed(() => route.path === '/policy-analysis/security-policy');

// 页头操作（仅安全策略页显示）
const addDeviceVisible = ref(false);
const uploadConfigVisible = ref(false);
function goOptimizeLog() {
  void router.push('/policy-analysis/optimize-log');
}
function goFirewallDeviceManagement() {
  void router.push('/policy-analysis/firewall-device-management');
}
function goTagManage() {
  void router.push('/tag-manage');
}

async function loadPageDoc() {
  pageDocContent.value = '';
  pageDocLoading.value = true;
  try {
    const res = await fetch(docPath.value);
    pageDocContent.value = res.ok ? await res.text() : '# 暂无说明\n当前页面暂无说明文档。';
  } catch {
    pageDocContent.value = '# 暂无说明\n当前页面暂无说明文档。';
  } finally {
    pageDocLoading.value = false;
  }
}

function openPageDoc() {
  pageDocVisible.value = true;
}

watch(pageDocVisible, (visible) => {
  if (visible) loadPageDoc();
});
watch(docPath, () => {
  if (pageDocVisible.value) loadPageDoc();
});
</script>

<template>
  <section class="policy-analysis">
    <PageHeader title="策略分析" subtitle="基于防火墙策略的统计与筛查" variant="simple">
      <template #actions>
        <PolicyAnalysisHeaderActions />
        <div v-if="isSecurityPolicy" class="policy-analysis__header-ops">
          <ElButton size="small" @click="goTagManage">标签管理</ElButton>
          <ElButton size="small" :icon="Document" @click="goOptimizeLog">优化日志</ElButton>
          <ElButton size="small" :icon="Setting" @click="goFirewallDeviceManagement">设备管理</ElButton>
        </div>
        <ElButton size="small" :icon="InfoFilled" @click="openPageDoc">页面说明</ElButton>
      </template>
    </PageHeader>
    <ElDialog
      v-model="pageDocVisible"
      title="页面说明"
      width="640px"
      class="page-doc-dialog"
    >
      <div v-loading="pageDocLoading" class="page-doc-body">
        <pre class="page-doc-markdown">{{ pageDocContent }}</pre>
      </div>
    </ElDialog>

    <PageContent class="policy-analysis__content">
      <router-view />
    </PageContent>
  </section>

  <ElDialog v-model="addDeviceVisible" title="添加设备" width="520px">
    <div style="min-height: 120px; color: var(--el-text-color-secondary);">
      添加设备弹窗内容待补充（占位）。
    </div>
  </ElDialog>

  <ElDialog v-model="uploadConfigVisible" title="上传配置" width="520px">
    <div style="min-height: 120px; color: var(--el-text-color-secondary);">
      上传配置弹窗内容待补充（占位）。
    </div>
  </ElDialog>
</template>

<style scoped>
.policy-analysis {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  gap: 0;
}

.policy-analysis__content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding-top: 0;
  display: flex;
  flex-direction: column;
}

.policy-analysis__header-ops {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
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
}
</style>


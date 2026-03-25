<script setup lang="ts">
import { ref } from 'vue';
import { InfoFilled } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/PageHeader.vue';
import PageContent from '@/components/PageContent.vue';

interface DemoRow {
  name: string;
  status: 'online' | 'offline' | 'draft';
  owner: string;
  updated: string;
}

const { t } = useI18n();

const rows = ref<DemoRow[]>([
  { name: '流量探针', status: 'online', owner: 'Alice', updated: '2026-01-18' },
  { name: '业务画像', status: 'draft', owner: 'Bob', updated: '2026-01-25' },
  { name: '规则库', status: 'offline', owner: 'Clara', updated: '2026-01-09' },
]);

function statusTag(type: DemoRow['status']) {
  switch (type) {
    case 'online':
      return { type: 'success', label: t('demo.status.online') };
    case 'draft':
      return { type: 'warning', label: t('demo.status.draft') };
    default:
      return { type: 'info', label: t('demo.status.offline') };
  }
}

function handleAction(action: 'approve' | 'reject' | 'view', row: DemoRow) {
  console.info(`[demo:${action}]`, row.name);
}

function handlePageInfo() {
  console.info('[demo:info] open page description');
}

function handleBack() {
  console.info('[demo:back] navigate previous');
}
</script>

<template>
  <section class="demo">
    <PageHeader
      :title="t('demo.title')"
      :subtitle="t('demo.description')"
      variant="simple"
      show-back
      @back="handleBack"
    >
      <template #actions>
        <ElButton
          size="small"
          type="primary"
          link
          :icon="InfoFilled"
          @click="handlePageInfo"
        >
          页面说明
        </ElButton>
      </template>
    </PageHeader>

    <PageContent>
      <ElRow :gutter="16" class="demo__cards">
        <ElCol :xs="24" :md="8">
          <ElCard shadow="hover">
            <h3>Element Plus</h3>
            <p>快速使用内置组件构建后台页面，实现统一交互与视觉体验。</p>
          </ElCard>
        </ElCol>
        <ElCol :xs="24" :md="8">
          <ElCard shadow="hover">
            <h3>可复用组件</h3>
            <p>将常用布局、表格、空状态等抽离为组件，提升团队交付效率。</p>
          </ElCard>
        </ElCol>
        <ElCol :xs="24" :md="8">
          <ElCard shadow="hover">
            <h3>文档化协作</h3>
            <p>与产品文档、原型、接口说明联动，维护一致的项目知识库。</p>
          </ElCard>
        </ElCol>
      </ElRow>

      <ElCard class="demo__table" shadow="never">
        <ElTable :data="rows" size="large" border>
          <ElTableColumn :label="t('demo.table.name')" prop="name" />
          <ElTableColumn :label="t('demo.table.status')" prop="status">
            <template #default="{ row }">
              <ElTag :type="statusTag(row.status).type">{{ statusTag(row.status).label }}</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn :label="t('demo.table.owner')" prop="owner" />
          <ElTableColumn :label="t('demo.table.updated')" prop="updated" />
          <ElTableColumn align="right" width="220">
            <template #header>
              {{ t('demo.actions.view') }}
            </template>
            <template #default="{ row }">
              <ElButton size="small" type="primary" link @click="handleAction('view', row)">
                {{ t('demo.actions.view') }}
              </ElButton>
              <ElButton size="small" type="success" link @click="handleAction('approve', row)">
                {{ t('demo.actions.approve') }}
              </ElButton>
              <ElButton size="small" type="danger" link @click="handleAction('reject', row)">
                {{ t('demo.actions.reject') }}
              </ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </PageContent>
  </section>
</template>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.demo__cards {
  margin-bottom: 16px;
}

.demo__table {
  border-radius: 12px;
}

</style>

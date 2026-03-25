<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PageContent from '@/components/PageContent.vue';
import PolicyChangeHeaderActions from '@/components/PolicyChangeHeaderActions.vue';
</script>

<template>
  <section class="policy-page">
    <PageHeader title="策略编辑" variant="simple">
      <template #actions>
        <PolicyChangeHeaderActions />
      </template>
    </PageHeader>

    <PageContent>
      <section class="policy-page__placeholder">
        <ElResult title="策略编辑" sub-title="此页面内容由你后续补充。" />
      </section>
    </PageContent>
  </section>
</template>

<style scoped>
.policy-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.policy-page__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  background-color: var(--color-background-soft);
  border: 1px dashed var(--color-border);
  border-radius: 16px;
}
</style>


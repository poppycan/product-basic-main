<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

/** 与路由 name 对应的「选中入口」展示名 */
const LABEL_BY_NAME: Record<string, string> = {
  'policy-change-open': '策略开通',
  'policy-change-nat-open': 'NAT开通',
  'policy-change-open-detail': '策略开通明细',
  'policy-change-recycle': '策略回收',
  'policy-change-modify': '策略修改',
  'policy-change-edit': '策略编辑',
};

const entryLabel = computed(() => {
  const name = route.name as string | undefined;
  if (name && LABEL_BY_NAME[name]) {
    return LABEL_BY_NAME[name];
  }
  return '策略开通';
});

function goPolicyChangeRoot() {
  void router.push({ name: 'policy-change-open' });
}
</script>

<template>
  <nav class="policy-change-bc" aria-label="breadcrumb">
    <button type="button" class="policy-change-bc__seg policy-change-bc__link" @click="goPolicyChangeRoot">
      策略变更
    </button>
    <span class="policy-change-bc__sep">/</span>
    <span class="policy-change-bc__seg policy-change-bc__current">{{ entryLabel }}</span>
  </nav>
</template>

<style scoped>
.policy-change-bc {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.policy-change-bc__seg {
  font-size: 13px;
  line-height: 1.4;
}

.policy-change-bc__link {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  color: var(--color-text-secondary, #64748b);
  text-decoration: none;
  font-family: inherit;
}

.policy-change-bc__link:hover {
  text-decoration: underline;
  color: var(--color-text, #1f2a37);
}

.policy-change-bc__sep {
  color: var(--color-text-secondary, #64748b);
  font-size: 13px;
  user-select: none;
}

.policy-change-bc__current {
  color: var(--color-text, #1f2a37);
  font-weight: 500;
}
</style>

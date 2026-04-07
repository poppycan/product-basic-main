<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const entries = [
  { label: '策略开通', path: '/policy-change/open' },
  { label: 'NAT开通', path: '/policy-change/nat-open' },
  { label: '策略开通明细', path: '/policy-change/open-detail' },
  { label: '策略回收', path: '/policy-change/recycle' },
];

const activePath = computed(() => {
  const p = route.path;
  return entries.some((e) => e.path === p) ? p : '';
});

function go(path: string) {
  void router.push(path);
}
</script>

<template>
  <ElButton
    v-for="e in entries"
    :key="e.path"
    size="small"
    :type="activePath === e.path ? 'primary' : ''"
    :plain="activePath !== e.path"
    @click="go(e.path)"
  >
    {{ e.label }}
  </ElButton>
</template>


<script setup lang="ts">
/**
 * IP 相关：类型（地址对象 / IP / 掩码）单选 + 后置控件；仅单条，无逗号分隔。
 */
import { computed, ref, watch } from 'vue';
import { ElInput, ElOption, ElSelect } from 'element-plus';
import NatTablePickerField from '@/components/NatTablePickerField.vue';
import { MOCK_ADDR_OBJECTS } from '@/api/mock/nat-form-pickers';

export type NatIpKind = 'object' | 'ip' | 'cidr';

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
}>();

const addrRows = MOCK_ADDR_OBJECTS.map((o) => ({
  id: o.id,
  name: o.name,
  address: o.address,
}));

const kind = ref<NatIpKind>('ip');

function inferKind(v: string): NatIpKind {
  const s = v.trim();
  if (!s) return 'ip';
  if (s.includes('/')) return 'cidr';
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) return 'ip';
  return 'object';
}

watch(
  () => props.modelValue,
  (v) => {
    kind.value = inferKind(v ?? '');
  },
  { immediate: true },
);

const objectRows = computed(() =>
  addrRows.map((r) => ({ id: r.id, name: r.name, address: r.address })),
);

/** 对象模式存对象名称（与列表展示一致） */
const objectName = computed({
  get() {
    if (kind.value !== 'object') return '';
    return props.modelValue;
  },
  set(v: string) {
    emit('update:modelValue', v);
  },
});

const ipOrCidr = computed({
  get() {
    return props.modelValue;
  },
  set(v: string) {
    emit('update:modelValue', v);
  },
});

function onKindChange() {
  emit('update:modelValue', '');
}
</script>

<template>
  <div class="nat-ip-kind-field">
    <ElSelect
      v-model="kind"
      class="nat-ip-kind-field__kind"
      placeholder="类型"
      :disabled="disabled"
      @change="onKindChange"
    >
      <ElOption label="地址对象" value="object" />
      <ElOption label="IP" value="ip" />
      <ElOption label="掩码" value="cidr" />
    </ElSelect>
    <div class="nat-ip-kind-field__tail">
      <NatTablePickerField
        v-if="kind === 'object'"
        v-model="objectName"
        :rows="objectRows"
        row-key="name"
        display-key="name"
        :columns="[
          { prop: 'name', label: '名称', minWidth: 120 },
          { prop: 'address', label: '地址', minWidth: 140 },
        ]"
        placeholder="点击选择对象"
        dialog-title="地址对象"
        :search-keys="['name']"
        :disabled="disabled"
      />
      <ElInput
        v-else-if="kind === 'ip'"
        v-model="ipOrCidr"
        :disabled="disabled"
        placeholder="单个 IPv4，如 192.168.1.1"
        clearable
      />
      <ElInput
        v-else
        v-model="ipOrCidr"
        :disabled="disabled"
        placeholder="例：192.168.10.5/24"
        clearable
      />
    </div>
  </div>
</template>

<style scoped>
.nat-ip-kind-field {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.nat-ip-kind-field__kind {
  width: 120px;
  flex-shrink: 0;
}

.nat-ip-kind-field__tail {
  flex: 1;
  min-width: 160px;
}
</style>

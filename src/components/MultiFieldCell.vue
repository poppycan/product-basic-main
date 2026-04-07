<script setup lang="ts">
/**
 * 同列多字段：字段之间换行；有前缀时前缀与值同一行。
 * 有空字段/留白：其它字段内容可换行占用下方空白（spare=true）。
 * 字段全有值：一行一字段，超出省略 + hover 看全（spare=false）。
 */
defineProps<{
  /** true：本列存在无值字段/留白，字段内容可在留白内多行展开 */
  spare: boolean;
}>();
</script>

<template>
  <div class="cell-multi-field" :class="spare ? 'cell-multi-field--spare' : 'cell-multi-field--full'">
    <slot />
  </div>
</template>

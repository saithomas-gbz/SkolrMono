<template>
  <div class="child-selector">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>
    <Select
      v-else
      :model-value="activeChildId"
      :options="children"
      option-label="label"
      option-value="studentId"
      :loading="pending"
      :placeholder="$t('parent.select_child')"
      @update:model-value="setActiveChildId"
    />
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';

const { fetchChildren } = useParent();
const { activeChildId, setActiveChildId } = useParentChild();

const rawChildren = ref<Awaited<ReturnType<typeof fetchChildren>>>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);

const children = computed(() =>
  rawChildren.value.map((child) => ({
    studentId: child.studentId,
    label: child.student?.name ?? child.studentId,
  })),
);

onMounted(async () => {
  try {
    rawChildren.value = await fetchChildren();
    if (!activeChildId.value && rawChildren.value.length > 0) {
      const primary = rawChildren.value.find((child) => child.isPrimary) ?? rawChildren.value[0]!;
      setActiveChildId(primary.studentId);
    }
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});
</script>

<style scoped>
.child-selector {
  min-width: 16rem;
}
</style>

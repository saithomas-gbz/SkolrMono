<template>
  <div class="needs-attention">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="list-loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>{{ $t('admin.dashboard.needs_attention.loading') }}</span>
    </div>

    <p v-else-if="items.length === 0" class="list-empty">{{ $t('admin.dashboard.needs_attention.empty') }}</p>

    <div v-else class="list">
      <div v-for="item in items" :key="item.userId" class="list-row">
        <span class="list-label">{{ $t('admin.dashboard.needs_attention.unexcused', { name: item.name, count: item.count }) }}</span>
        <Tag
          :value="item.urgent ? $t('admin.dashboard.needs_attention.urgent') : $t('admin.dashboard.needs_attention.watch')"
          :severity="item.urgent ? 'danger' : 'secondary'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';

const { fetchAbsences } = usePlanning();
const { fetchUsersByIds } = useUser();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const items = ref<{ userId: string; name: string; count: number; urgent: boolean }[]>([]);

const URGENT_THRESHOLD = 3;
const WATCH_THRESHOLD = 2;

onMounted(async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const absences = await fetchAbsences();
    const counts = new Map<string, number>();
    for (const absence of absences) {
      if (absence.justified) continue;
      if (absence.role !== 'STUDENT') continue;
      if (new Date(absence.createdAt) < sevenDaysAgo) continue;
      counts.set(absence.userId, (counts.get(absence.userId) ?? 0) + 1);
    }

    const flagged = [...counts.entries()].filter(([, count]) => count >= WATCH_THRESHOLD);
    const users = await fetchUsersByIds(flagged.map(([userId]) => userId));
    const nameById = new Map(users.map((u) => [u.id, u.name ?? u.email]));

    items.value = flagged
      .map(([userId, count]) => ({
        userId,
        name: nameById.get(userId) ?? userId,
        count,
        urgent: count >= URGENT_THRESHOLD,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});
</script>

<style scoped>
.list-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.list-empty {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--skolr-space-2);
}

.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--skolr-space-3);
  padding: 10px 0;
  border-bottom: 1px solid var(--skolr-color-divider);
}

.list-row:last-child {
  border-bottom: none;
}

.list-label {
  font-size: 13px;
}
</style>

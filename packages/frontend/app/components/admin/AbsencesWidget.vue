<template>
  <div class="absences-widget">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="widget-loading">
      <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="recentAbsences.length === 0" class="widget-empty">
      <p>{{ $t('admin.absences_widget.no_absences') }}</p>
    </div>

    <ul v-else class="absence-list">
      <li v-for="absence in recentAbsences" :key="absence.id" class="absence-item">
        <span class="absence-date">{{ formatDate(absence.createdAt) }}</span>
        <Tag
          :value="absence.justified ? $t('admin.absences_widget.justified') : $t('admin.absences_widget.not_justified')"
          :severity="absence.justified ? 'success' : 'warn'"
          class="absence-tag"
        />
      </li>
    </ul>

    <div class="widget-footer">
      <NuxtLink to="/planning/absences" class="widget-link">{{ $t('admin.absences_widget.see_all') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';

const { fetchAbsences } = usePlanning();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const recentAbsences = ref<Awaited<ReturnType<typeof fetchAbsences>>>([]);

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

onMounted(async () => {
  try {
    const all = await fetchAbsences();
    recentAbsences.value = all
      .filter((a) => new Date(a.createdAt) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>

<style scoped>
.absences-widget {
  display: grid;
  gap: 0.75rem;
}

.widget-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 4rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.widget-empty {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  padding: 0.5rem 0;
}

.widget-empty p {
  margin: 0;
}

.absence-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.absence-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--p-surface-100, var(--skolr-color-border));
  font-size: 0.9rem;
}

.absence-item:last-child {
  border-bottom: none;
}

.absence-date {
  color: var(--p-text-color, inherit);
}

.widget-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.widget-link {
  font-size: 0.9rem;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
  text-decoration: none;
}

.widget-link:hover {
  text-decoration: underline;
}
</style>

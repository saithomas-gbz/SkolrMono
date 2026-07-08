<template>
  <div class="kpi-widget">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="widget-loading">
      <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <template v-else>
      <div class="kpi-card">
        <span class="kpi-value">{{ unjustifiedCount }}</span>
        <span class="kpi-label">{{ $t('teacher.dashboard.unjustified_absences_count', { count: unjustifiedCount }) }}</span>
      </div>
      <div class="widget-footer">
        <NuxtLink to="/planning/absences" class="widget-link">{{ $t('teacher.dashboard.see_absences') }}</NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';

const { fetchAbsences } = usePlanning();
const { userId } = useAuth();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const unjustifiedCount = ref(0);

onMounted(async () => {
  if (!userId.value) {
    pending.value = false;
    return;
  }

  try {
    const absences = await fetchAbsences({ teacherId: userId.value, role: 'STUDENT' });
    unjustifiedCount.value = absences.filter((a) => !a.justified).length;
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});
</script>

<style scoped>
.kpi-widget {
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

.kpi-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 1.25rem 1rem;
  border-radius: 0.75rem;
  background: var(--p-surface-50, var(--skolr-color-surface-hover));
  border: 1px solid var(--p-surface-200, var(--skolr-color-border));
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
}

.kpi-label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  text-align: center;
}

.widget-footer {
  display: flex;
  justify-content: flex-end;
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

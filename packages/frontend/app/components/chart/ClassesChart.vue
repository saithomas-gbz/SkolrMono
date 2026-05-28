<template>
  <div class="classes-chart">
    <div class="chart-toolbar">
      <div v-if="classOptions.length > 0" class="chart-select">
        <label class="chart-select-label" for="class-select">Classe</label>
        <Select
          id="class-select"
          v-model="selectedClassId"
          :options="classOptions"
          option-label="label"
          option-value="value"
          placeholder="Choisir une classe"
          class="chart-select-input"
        />
      </div>
      <Button
        label="Actualiser"
        icon="pi pi-refresh"
        :loading="pending"
        severity="secondary"
        outlined
        size="small"
        @click="() => refreshAll()"
      />
    </div>

    <Message v-if="fetchError" severity="error" :closable="false" class="chart-message">
      {{ fetchError }}
    </Message>

    <div v-else-if="listPending" class="chart-loading">
      <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
      <span>Chargement de la liste des classes…</span>
    </div>

    <div v-else-if="classOptions.length === 0" class="chart-empty">
      <p>Aucune classe en base pour le moment.</p>
      <p class="chart-empty-hint">
        Lancez <code>bun run seed:dev</code> à la racine du monorepo ou créez une classe via l’API.
      </p>
    </div>

    <template v-else>
      <div v-if="detailPending" class="chart-loading">
        <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
        <span>Chargement de la classe…</span>
      </div>

      <template v-else-if="selectedClass">
        <p v-if="selectedClass.description" class="class-description">
          {{ selectedClass.description }}
        </p>

        <div v-if="!hasChartData" class="chart-empty">
          <p>
            La classe <strong>{{ selectedClass.name }}</strong> n’a pas encore d’enseignants ni
            d’élèves.
          </p>
        </div>

        <div v-else class="chart-canvas-wrap">
          <Chart type="pie" :data="chartData" :options="chartOptions" class="chart-canvas" />
        </div>
      </template>
    </template>

    <p v-if="apiMessage && !fetchError && !pending" class="api-message">{{ apiMessage }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  /** Pré-sélection (SSR) — ex. depuis `?classId=` sur `/dashboard`. */
  initialClassId?: string;
}>();

const api = useApi();
const apiMessage = ref<string | null>(null);

const {
  selectedClassId,
  classOptions,
  summaryResponse,
  listPending,
  listError,
  refreshSummary,
} = await useChartClassSelection({
  initialClassId: () => props.initialClassId,
});

const classDetailUrl = computed(() =>
  selectedClassId.value ? `/class/classes/${selectedClassId.value}` : null,
);

const {
  data: classResponse,
  pending: detailPending,
  error: detailError,
  refresh: refreshClassDetail,
} = await useFetch<ClassApiResponse>(() => classDetailUrl.value, {
  $fetch: api,
  watch: [selectedClassId],
  immediate: true,
  default: () => ({ data: null, message: '' }),
});

const selectedClass = computed(() => classResponse.value?.data ?? null);

const pending = computed(
  () => listPending.value || (Boolean(selectedClassId.value) && detailPending.value),
);

const fetchError = computed(() => {
  if (listError.value) {
    return normalizeApiError(listError.value);
  }
  if (detailError.value) {
    return normalizeApiError(detailError.value);
  }
  return null;
});

const teacherCount = computed(() => selectedClass.value?.classTeachers?.length ?? 0);

const studentCount = computed(() => selectedClass.value?.students?.length ?? 0);

const hasChartData = computed(() => teacherCount.value + studentCount.value > 0);

watch(
  [summaryResponse, classResponse],
  ([summary, detail]) => {
    apiMessage.value = detail?.message ?? summary?.message ?? null;
  },
  { immediate: true },
);

async function refreshAll() {
  await Promise.all([refreshSummary(), refreshClassDetail()]);
}

/** Couleurs fixes (Chart.js canvas n’interprète pas les var() CSS). */
const PIE_SLICE_COLORS = {
  teachers: { fill: '#6366f1', hover: '#4f46e5', border: '#4338ca' },
  students: { fill: '#f97316', hover: '#ea580c', border: '#c2410c' },
} as const;

const chartData = computed(() => ({
  labels: ['Professeurs', 'Élèves'],
  datasets: [
    {
      data: [teacherCount.value, studentCount.value],
      backgroundColor: [PIE_SLICE_COLORS.teachers.fill, PIE_SLICE_COLORS.students.fill],
      hoverBackgroundColor: [PIE_SLICE_COLORS.teachers.hover, PIE_SLICE_COLORS.students.hover],
      borderColor: [PIE_SLICE_COLORS.teachers.border, PIE_SLICE_COLORS.students.border],
      borderWidth: 2,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
    tooltip: {
      callbacks: {
        label(context: { label?: string; parsed: number; dataset: { data: number[] } }) {
          const total = context.dataset.data.reduce((sum, n) => sum + n, 0);
          const value = context.parsed;
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return `${context.label}: ${value} (${pct} %)`;
        },
      },
    },
  },
};
</script>

<style scoped>
.classes-chart {
  display: grid;
  gap: 1rem;
}

.chart-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.chart-select {
  display: grid;
  gap: 0.35rem;
  min-width: min(100%, 16rem);
  flex: 1;
}

.chart-select-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-text-muted-color, #64748b);
}

.chart-select-input {
  width: 100%;
}

.chart-message {
  margin: 0;
}

.chart-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 12rem;
  color: var(--p-text-muted-color, #64748b);
}

.chart-empty {
  padding: 0.5rem 0;
  min-height: 8rem;
  color: var(--p-text-muted-color, #64748b);
}

.chart-empty p {
  margin: 0 0 0.5rem;
}

.chart-empty-hint {
  font-size: 0.9rem;
}

.chart-empty-hint code {
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  background: var(--p-surface-100, #f1f5f9);
}

.class-description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--p-text-muted-color, #64748b);
}

.chart-canvas-wrap {
  position: relative;
  height: min(22rem, 50vh);
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.api-message {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-text-color-secondary, #64748b);
  font-style: italic;
}
</style>

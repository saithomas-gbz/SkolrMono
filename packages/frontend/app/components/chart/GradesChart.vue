<template>
  <div class="grades-chart">
    <div class="chart-toolbar">
      <div v-if="showClassSelect && classOptions.length > 0" class="chart-select">
        <label class="chart-select-label" for="grades-class-select">Classe</label>
        <Select
          id="grades-class-select"
          v-model="selectedClassId"
          :options="classOptions"
          option-label="label"
          option-value="value"
          placeholder="Choisir une classe"
          class="chart-select-input"
        />
      </div>
      <p v-else-if="isPersonalView" class="chart-scope-hint">Répartition de vos notes (toutes classes)</p>

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

    <div v-else-if="!isPersonalView && listPending" class="chart-loading">
      <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
      <span>Chargement de la liste des classes…</span>
    </div>

    <div v-else-if="!isPersonalView && classOptions.length === 0" class="chart-empty">
      <p>Aucune classe en base pour le moment.</p>
      <p class="chart-empty-hint">
        Lancez <code>bun run seed:dev</code> à la racine du monorepo.
      </p>
    </div>

    <div v-else-if="isPersonalView && !userId" class="chart-empty">
      <p>Session invalide : identifiant utilisateur manquant.</p>
    </div>

    <div v-else-if="!gradesUrl" class="chart-empty">
      <p>Sélectionnez une classe pour afficher la distribution des notes.</p>
    </div>

    <template v-else>
      <div v-if="gradesPending" class="chart-loading">
        <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
        <span>Chargement des notes…</span>
      </div>

      <template v-else>
        <p v-if="chartSubtitle" class="chart-subtitle">{{ chartSubtitle }}</p>

        <div v-if="!hasChartData" class="chart-empty">
          <p>{{ emptyMessage }}</p>
        </div>

        <div v-else class="chart-canvas-wrap">
          <Chart type="bar" :data="chartData" :options="chartOptions" class="chart-canvas" />
        </div>
      </template>
    </template>

    <p v-if="apiMessage && !fetchError && !pending" class="api-message">{{ apiMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import {
  averageGradeValues,
  histogramBuckets,
  type GradeEntity,
  type GradeListApiResponse,
} from '~/composables/useGrade';
import { CHART_PRIMARY } from '~/themes/tokens';

const props = defineProps<{
  /** Pré-sélection (SSR) — ex. depuis `?classId=` sur `/dashboard`. */
  initialClassId?: string;
}>();

const api = useApi();
const { role, userId } = useAuth();
const { normalizeApiError } = useGrade();
const apiMessage = ref<string | null>(null);

const isPersonalView = computed(() => role.value === 'USER');
const showClassSelect = computed(
  () => role.value === 'TEACHER' || role.value === 'ADMIN' || role.value === 'STAFF',
);

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

const gradesUrl = computed(() => {
  if (isPersonalView.value) {
    return userId.value ? `/grade/grades/user/${userId.value}` : null;
  }
  return selectedClassId.value ? `/grade/grades/class/${selectedClassId.value}` : null;
});

const {
  data: gradesResponse,
  pending: gradesPending,
  error: gradesError,
  refresh: refreshGrades,
} = await useFetch<GradeListApiResponse>(() => gradesUrl.value, {
  $fetch: api,
  watch: [gradesUrl],
  immediate: true,
  default: () => ({ data: [] as GradeEntity[], message: '' }),
});

const grades = computed(() => gradesResponse.value?.data ?? []);

const selectedClassLabel = computed(
  () => classOptions.value.find((o) => o.value === selectedClassId.value)?.label ?? null,
);

const buckets = computed(() => histogramBuckets(grades.value));

const gradeAverage = computed(() => averageGradeValues(grades.value));

const hasChartData = computed(() => buckets.value.some((b) => b.count > 0));

const pending = computed(() => {
  if (isPersonalView.value) {
    return gradesPending.value;
  }
  return listPending.value || (Boolean(gradesUrl.value) && gradesPending.value);
});

const fetchError = computed(() => {
  if (!isPersonalView.value && listError.value) {
    return normalizeApiError(listError.value);
  }
  if (gradesError.value) {
    return normalizeApiError(gradesError.value);
  }
  return null;
});

const chartSubtitle = computed(() => {
  const avg = gradeAverage.value;
  const avgLabel = avg !== null ? ` · moyenne ${roundScore(avg)}/20` : '';
  if (isPersonalView.value) {
    return `${grades.value.length} note(s)${avgLabel}`;
  }
  if (selectedClassLabel.value) {
    return `Classe ${selectedClassLabel.value} — ${grades.value.length} note(s)${avgLabel}`;
  }
  return null;
});

const emptyMessage = computed(() => {
  if (isPersonalView.value) {
    return 'Aucune note enregistrée pour votre compte.';
  }
  if (selectedClassLabel.value) {
    return `Aucune note pour la classe ${selectedClassLabel.value}.`;
  }
  return 'Aucune note à afficher.';
});

watch(gradesResponse, (response) => {
  apiMessage.value = response?.message ?? summaryResponse.value?.message ?? null;
});

async function refreshAll() {
  const tasks: Promise<unknown>[] = [refreshGrades()];
  if (!isPersonalView.value) {
    tasks.push(refreshSummary());
  }
  await Promise.all(tasks);
}

const chartData = computed(() => ({
  labels: buckets.value.map((b) => b.label),
  datasets: [
    {
      label: 'Nombre de notes',
      data: buckets.value.map((b) => b.count),
      backgroundColor: CHART_PRIMARY.fill,
      hoverBackgroundColor: CHART_PRIMARY.hover,
      borderColor: CHART_PRIMARY.border,
      borderWidth: 1,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        precision: 0,
      },
      title: {
        display: true,
        text: 'Effectif',
      },
    },
    x: {
      title: {
        display: true,
        text: 'Tranche de note (/20)',
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label(context: { parsed: { y: number } }) {
          const count = context.parsed.y;
          return count === 1 ? '1 note' : `${count} notes`;
        },
      },
    },
  },
};

function roundScore(value: number): string {
  return String(Math.round(value * 10) / 10);
}
</script>

<style scoped>
.grades-chart {
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
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.chart-select-input {
  width: 100%;
}

.chart-scope-hint {
  margin: 0;
  flex: 1;
  font-size: 0.9rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.chart-message {
  margin: 0;
}

.chart-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 12rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.chart-empty {
  padding: 0.5rem 0;
  min-height: 8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
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
  background: var(--p-surface-100, var(--skolr-color-surface-hover));
}

.chart-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.chart-canvas-wrap {
  position: relative;
  height: min(22rem, 50vh);
  width: 100%;
  max-width: 36rem;
  margin: 0 auto;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.api-message {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-text-color-secondary, var(--skolr-color-text-muted));
  font-style: italic;
}
</style>

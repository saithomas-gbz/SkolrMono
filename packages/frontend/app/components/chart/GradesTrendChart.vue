<template>
  <div class="grades-trend-chart">
    <div class="chart-toolbar">
      <p class="chart-scope-hint">Évolution de vos notes dans le temps</p>
      <Button
        label="Actualiser"
        icon="pi pi-refresh"
        :loading="pending"
        severity="secondary"
        outlined
        size="small"
        @click="() => refresh()"
      />
    </div>

    <Message v-if="fetchError" severity="error" :closable="false" class="chart-message">
      {{ fetchError }}
    </Message>

    <div v-else-if="pending" class="chart-loading">
      <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
      <span>Chargement de vos notes…</span>
    </div>

    <div v-else-if="!userId" class="chart-empty">
      <p>Session invalide : identifiant utilisateur manquant.</p>
    </div>

    <template v-else>
      <p v-if="chartSubtitle" class="chart-subtitle">{{ chartSubtitle }}</p>

      <div v-if="!hasChartData" class="chart-empty">
        <p>Aucune note enregistrée pour votre compte.</p>
      </div>

      <div v-else class="chart-canvas-wrap">
        <Chart type="line" :data="chartData" :options="chartOptions" class="chart-canvas" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  averageGradeValues,
  type GradeEntity,
  type GradeListApiResponse,
} from '~/composables/useGrade';
import { CHART_PRIMARY, CHART_PRIMARY_AREA_FILL } from '~/themes/tokens';

const api = useApi();
const { userId } = useAuth();
const { normalizeApiError } = useGrade();

const gradesUrl = computed(() =>
  userId.value ? `/grade/grades/user/${userId.value}` : null,
);

const {
  data: gradesResponse,
  pending,
  error: gradesError,
  refresh,
} = await useFetch<GradeListApiResponse>(() => gradesUrl.value, {
  $fetch: api,
  watch: [gradesUrl],
  immediate: true,
  default: () => ({ data: [] as GradeEntity[], message: '' }),
});

const sortedGrades = computed(() =>
  [...(gradesResponse.value?.data ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  ),
);

const hasChartData = computed(() => sortedGrades.value.length > 0);

const fetchError = computed(() =>
  gradesError.value ? normalizeApiError(gradesError.value) : null,
);

const gradeAverage = computed(() => averageGradeValues(sortedGrades.value));

const chartSubtitle = computed(() => {
  const count = sortedGrades.value.length;
  const avg = gradeAverage.value;
  const avgLabel = avg !== null ? ` · moyenne ${roundScore(avg)}/20` : '';
  return count > 0 ? `${count} note(s)${avgLabel}` : null;
});

const chartData = computed(() => ({
  labels: sortedGrades.value.map((g) => formatDate(g.createdAt)),
  datasets: [
    {
      label: 'Note /20',
      data: sortedGrades.value.map((g) => g.value),
      borderColor: CHART_PRIMARY.fill,
      backgroundColor: CHART_PRIMARY_AREA_FILL,
      pointBackgroundColor: CHART_PRIMARY.border,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
      tension: 0.3,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      min: 0,
      max: 20,
      ticks: { stepSize: 2 },
      title: { display: true, text: 'Note (/20)' },
    },
    x: {
      title: { display: true, text: 'Date' },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label(context: { parsed: { y: number } }) {
          return `${context.parsed.y}/20`;
        },
      },
    },
  },
};

function roundScore(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
</script>

<style scoped>
.grades-trend-chart {
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

.chart-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.chart-canvas-wrap {
  position: relative;
  height: min(22rem, 50vh);
  width: 100%;
  max-width: 42rem;
  margin: 0 auto;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}
</style>

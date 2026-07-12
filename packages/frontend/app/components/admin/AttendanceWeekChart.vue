<template>
  <div class="attendance-week-chart">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="chart-loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>{{ $t('admin.dashboard.attendance_chart.loading') }}</span>
    </div>

    <div v-else class="chart-canvas-wrap">
      <Chart type="bar" :data="chartData" :options="chartOptions" class="chart-canvas" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import { CHART_PRIMARY } from '~/themes/tokens';

const { t } = useI18n();
const { fetchAbsences } = usePlanning();

const pending = ref(true);
const fetchError = ref<string | null>(null);

const WEEKDAY_LABELS = [
  t('admin.dashboard.attendance_chart.mon'),
  t('admin.dashboard.attendance_chart.tue'),
  t('admin.dashboard.attendance_chart.wed'),
  t('admin.dashboard.attendance_chart.thu'),
  t('admin.dashboard.attendance_chart.fri'),
];

const countsByWeekday = ref<number[]>([0, 0, 0, 0, 0]);

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

onMounted(async () => {
  try {
    const absences = await fetchAbsences();
    const weekStart = startOfWeek(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 5);

    const counts = [0, 0, 0, 0, 0];
    for (const absence of absences) {
      const date = new Date(absence.createdAt);
      if (date < weekStart || date >= weekEnd) continue;
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
      if (dayIndex < 5) counts[dayIndex]!++;
    }
    countsByWeekday.value = counts;
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});

const chartData = computed(() => ({
  labels: WEEKDAY_LABELS,
  datasets: [
    {
      label: t('admin.dashboard.attendance_chart.title'),
      data: countsByWeekday.value,
      backgroundColor: CHART_PRIMARY.fill,
      hoverBackgroundColor: CHART_PRIMARY.hover,
      borderRadius: 0,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
  },
  plugins: { legend: { display: false } },
};
</script>

<style scoped>
.chart-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 12rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.chart-canvas-wrap {
  position: relative;
  height: 220px;
  width: 100%;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}
</style>

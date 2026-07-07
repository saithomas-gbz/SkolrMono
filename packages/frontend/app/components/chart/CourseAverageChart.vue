<template>
  <div class="course-average-chart">
    <Message v-if="fetchError" severity="error" :closable="false" class="chart-message">
      {{ fetchError }}
    </Message>

    <div v-else-if="pending" class="chart-loading">
      <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="!hasChartData" class="chart-empty">
      <p>{{ $t('stats.no_course_average') }}</p>
    </div>

    <div v-else class="chart-canvas-wrap">
      <Chart type="bar" :data="chartData" :options="chartOptions" class="chart-canvas" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CHART_PRIMARY } from '~/themes/tokens';

const props = defineProps<{
  classId: string | null;
}>();

const { t } = useI18n();
const { fetchClassStats, normalizeApiError } = useGrade();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const byCourse = ref<{ courseName: string; average: number | null }[]>([]);

async function load(classId: string | null) {
  if (!classId) {
    byCourse.value = [];
    pending.value = false;
    return;
  }
  pending.value = true;
  fetchError.value = null;
  try {
    const stats = await fetchClassStats(classId);
    byCourse.value = stats.byCourse.map((c) => ({ courseName: c.courseName, average: c.average }));
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

watch(() => props.classId, load, { immediate: true });

const hasChartData = computed(() => byCourse.value.some((c) => c.average !== null));

const chartData = computed(() => ({
  labels: byCourse.value.map((c) => c.courseName),
  datasets: [
    {
      label: t('stats.course_average_dataset_label'),
      data: byCourse.value.map((c) => c.average),
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
      min: 0,
      max: 20,
      ticks: { stepSize: 2 },
      title: { display: true, text: t('stats.average_axis_title') },
    },
    x: {
      title: { display: true, text: t('stats.subject_axis_title') },
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
</script>

<style scoped>
.course-average-chart {
  display: grid;
  gap: 1rem;
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
  margin: 0;
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
</style>

<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('dashboard.my_classes') }}</template>
      <template #content>
        <StudentClassList />
      </template>
    </Card>
    <Card>
      <template #title>
        <div class="card-title-row">
          <span>{{ $t('dashboard.grade_progress') }}</span>
          <div class="card-title-actions">
            <Tag v-if="rank" :value="$t('stats.rank_badge', { position: rank.position, total: rank.totalStudents })" severity="info" />
            <NuxtLink to="/grades/my-grades" class="card-link">{{ $t('dashboard.see_all') }}</NuxtLink>
          </div>
        </div>
      </template>
      <template #content>
        <ChartGradesTrendChart />
      </template>
    </Card>
    <Card>
      <template #title>{{ $t('dashboard.grade_repartition') }}</template>
      <template #content>
        <ChartGradesChart />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import type { Rank } from '~/composables/useGrade';

definePageMeta({ middleware: ['auth', 'student'] });

const { fetchUserStats } = useGrade();
const { userId } = useAuth();

const rank = ref<Rank>(null);

onMounted(async () => {
  if (!userId.value) return;
  try {
    const stats = await fetchUserStats(userId.value);
    rank.value = stats.rank;
  } catch {
    // Badge de rang non bloquant : on laisse simplement la carte sans badge.
  }
});
</script>

<style scoped>
.page {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.page :deep(.p-card) {
  flex: 1 1 min(100%, 30rem);
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.card-title-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-link {
  float: right;
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
  text-decoration: none;
}

.card-link:hover {
  text-decoration: underline;
}
</style>

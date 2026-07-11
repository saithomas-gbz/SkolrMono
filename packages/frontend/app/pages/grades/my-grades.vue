<template>
  <div class="page">
    <Teleport to="#topbar-actions">
      <Button
        v-if="canAccess && !pending && courseGroups.length > 0"
        icon="pi pi-download"
        :label="downloading ? $t('grades.my_grades.downloading') : $t('grades.my_grades.download_bulletin')"
        :loading="downloading"
        size="small"
        @click="downloadBulletin"
      />
    </Teleport>
    <Card>
      <template #content>
        <Message v-if="!canAccess" severity="warn" :closable="false">
          {{ $t('grades.my_grades.restricted') }}
        </Message>

        <template v-else>
          <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

          <div v-else-if="pending" class="loading">
            <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
            <span>{{ $t('grades.my_grades.loading') }}</span>
          </div>

          <template v-else>
            <p v-if="courseGroups.length === 0" class="empty">{{ $t('grades.my_grades.empty') }}</p>

            <template v-else>
              <div v-if="stats" class="kpi-row">
                <KpiCard
                  :value="stats.average !== null ? roundScore(stats.average) : '—'"
                  :label="$t('grades.my_grades.kpi_overall')"
                />
                <KpiCard
                  v-if="bestSubject"
                  :value="roundScore(bestSubject.average!)"
                  :label="`${$t('grades.my_grades.kpi_best')} — ${bestSubject.courseName}`"
                  variant="accent"
                />
                <KpiCard
                  v-if="worstSubject"
                  :value="roundScore(worstSubject.average!)"
                  :label="`${$t('grades.my_grades.kpi_worst')} — ${worstSubject.courseName}`"
                />
                <KpiCard
                  v-if="trendDelta !== null"
                  :value="`${trendDelta > 0 ? '+' : ''}${roundScore(trendDelta)}`"
                  :label="$t('grades.my_grades.kpi_trend')"
                />
              </div>

              <Accordion :value="0" class="course-groups">
                <AccordionPanel v-for="(group, index) in courseGroups" :key="group.course.id" :value="index">
                  <AccordionHeader>
                    <div class="course-title-row">
                      <span>{{ group.course.name }}</span>
                      <Tag
                        :value="
                          group.average !== null
                            ? `${$t('grades.my_grades.average')} ${roundScore(group.average)}/20`
                            : $t('grades.my_grades.no_average')
                        "
                        :severity="gradeSeverity(group.average)"
                      />
                    </div>
                  </AccordionHeader>
                  <AccordionContent>
                    <div v-for="grade in group.grades" :key="grade.id" class="grade-row">
                      <span class="grade-date">{{ formatDate(grade.createdAt) }}</span>
                      <span class="grade-comment">{{ grade.comment ?? '—' }}</span>
                      <Tag
                        :value="statusLabel(grade)"
                        :severity="grade.status === 'GRADED' ? gradeSeverity(grade.value) : 'secondary'"
                      />
                    </div>
                  </AccordionContent>
                </AccordionPanel>
              </Accordion>
            </template>
          </template>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useGrade, averageGradeValues, type GradeCourse, type GradeEntity, type UserStats } from '~/composables/useGrade';
import { useAuthTokenCookie } from '~/composables/authSession';
import KpiCard from '~/components/ui/KpiCard.vue';

definePageMeta({ middleware: ['auth'] });

const { t } = useI18n();
const { hasRole, userId } = useAuth();
const { fetchGradesByUserId, fetchUserStats, normalizeApiError, roundScore } = useGrade();
const config = useRuntimeConfig();
const authTokenCookie = useAuthTokenCookie();
const toast = useToast();

const canAccess = computed(() => hasRole('USER'));

usePageHeader().setPageHeader({ title: t('grades.my_grades.title') });

const grades = ref<GradeEntity[]>([]);
const stats = ref<UserStats | null>(null);
const pending = ref(true);
const fetchError = ref<string | null>(null);
const downloading = ref(false);

const bestSubject = computed(() => {
  const withAverage = (stats.value?.byCourse ?? []).filter((c) => c.average !== null);
  return withAverage.length === 0
    ? null
    : withAverage.reduce((best, c) => (c.average! > best.average! ? c : best));
});

const worstSubject = computed(() => {
  const withAverage = (stats.value?.byCourse ?? []).filter((c) => c.average !== null);
  return withAverage.length === 0
    ? null
    : withAverage.reduce((worst, c) => (c.average! < worst.average! ? c : worst));
});

const trendDelta = computed(() => {
  const trend = stats.value?.trend ?? [];
  if (trend.length < 2) return null;
  return trend[trend.length - 1]!.average - trend[trend.length - 2]!.average;
});

type CourseGroup = {
  course: GradeCourse;
  grades: GradeEntity[];
  average: number | null;
};

const courseGroups = computed<CourseGroup[]>(() => {
  const map = new Map<string, CourseGroup>();
  for (const grade of grades.value) {
    if (!grade.course) continue;
    let group = map.get(grade.course.id);
    if (!group) {
      group = { course: grade.course, grades: [], average: null };
      map.set(grade.course.id, group);
    }
    group.grades.push(grade);
  }
  const groups = [...map.values()];
  for (const group of groups) {
    group.grades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    group.average = averageGradeValues(group.grades);
  }
  groups.sort((a, b) => a.course.name.localeCompare(b.course.name));
  return groups;
});

async function load() {
  if (!userId.value) return;
  pending.value = true;
  fetchError.value = null;
  try {
    grades.value = await fetchGradesByUserId(userId.value);
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
  try {
    stats.value = await fetchUserStats(userId.value);
  } catch {
    // Non-bloquant : le header KPI ne s'affiche simplement pas si les stats échouent.
    stats.value = null;
  }
}

onMounted(() => {
  if (canAccess.value) {
    void load();
  } else {
    pending.value = false;
  }
});

function gradeSeverity(value: number | null): 'success' | 'warn' | 'danger' | 'secondary' {
  if (value === null) return 'secondary';
  if (value >= 14) return 'success';
  if (value >= 10) return 'warn';
  return 'danger';
}

function statusLabel(grade: GradeEntity): string {
  if (grade.status === 'GRADED' && grade.value !== null) return `${roundScore(grade.value)}/20`;
  if (grade.status === 'ABSENT') return t('grades.assignment.absent');
  if (grade.status === 'EXEMPT') return t('grades.assignment.exempt');
  return t('grades.assignment.pending');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function downloadBulletin() {
  if (!userId.value) return;
  downloading.value = true;
  try {
    const response = await fetch(
      `${config.public.gatewayBaseUrl}/grade/users/${userId.value}/bulletin`,
      { headers: { Authorization: `Bearer ${authTokenCookie.value ?? ''}` } },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulletin.pdf';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.add({ severity: 'error', summary: t('grades.my_grades.download_error'), life: 5000 });
  } finally {
    downloading.value = false;
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.empty {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1px;
  background: var(--skolr-color-divider);
  margin-bottom: 1rem;
}

.course-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.grade-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--skolr-color-divider);
}

.grade-row:last-child {
  border-bottom: none;
}

.grade-date {
  font-size: 0.8rem;
  color: var(--skolr-color-text-muted);
  width: 6rem;
  flex: none;
}

.grade-comment {
  flex: 1;
  min-width: 0;
}
</style>

<template>
  <div class="page">
    <Card>
      <template #title>
        <div class="title-row">
          <span>{{ $t('grades.my_grades.title') }}</span>
          <Button
            v-if="canAccess && !pending && courseGroups.length > 0"
            icon="pi pi-download"
            :label="downloading ? $t('grades.my_grades.downloading') : $t('grades.my_grades.download_bulletin')"
            :loading="downloading"
            size="small"
            @click="downloadBulletin"
          />
        </div>
      </template>
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

            <div v-else class="course-groups">
              <Card v-for="group in courseGroups" :key="group.course.id" class="course-card">
                <template #title>
                  <div class="course-title-row">
                    <span>{{ group.course.name }}</span>
                    <Tag
                      :value="
                        group.average !== null
                          ? `${$t('grades.my_grades.average')} ${formatScore(group.average)}/20`
                          : $t('grades.my_grades.no_average')
                      "
                      :severity="gradeSeverity(group.average)"
                    />
                  </div>
                </template>
                <template #content>
                  <DataTable :value="group.grades" data-key="id" class="table">
                    <Column :header="$t('grades.my_grades.date')">
                      <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
                    </Column>
                    <Column :header="$t('grades.my_grades.grade')">
                      <template #body="{ data }">
                        <Tag
                          :value="statusLabel(data)"
                          :severity="data.status === 'GRADED' ? gradeSeverity(data.value) : 'secondary'"
                        />
                      </template>
                    </Column>
                    <Column :header="$t('grades.my_grades.comment')">
                      <template #body="{ data }">{{ data.comment ?? '—' }}</template>
                    </Column>
                  </DataTable>
                </template>
              </Card>
            </div>
          </template>
        </template>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useGrade, averageGradeValues, type GradeCourse, type GradeEntity } from '~/composables/useGrade';
import { useAuthTokenCookie } from '~/composables/authSession';

definePageMeta({ middleware: ['auth'] });

const { t } = useI18n();
const { hasRole, userId } = useAuth();
const { fetchGradesByUserId, normalizeApiError } = useGrade();
const config = useRuntimeConfig();
const authTokenCookie = useAuthTokenCookie();
const toast = useToast();

const canAccess = computed(() => hasRole('USER'));

const grades = ref<GradeEntity[]>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);
const downloading = ref(false);

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
  if (grade.status === 'GRADED' && grade.value !== null) return `${formatScore(grade.value)}/20`;
  if (grade.status === 'ABSENT') return t('grades.assignment.absent');
  if (grade.status === 'EXEMPT') return t('grades.assignment.exempt');
  return t('grades.assignment.pending');
}

function formatScore(value: number): string {
  return String(Math.round(value * 10) / 10);
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

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
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

.course-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.course-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.table {
  font-size: 0.9rem;
}
</style>

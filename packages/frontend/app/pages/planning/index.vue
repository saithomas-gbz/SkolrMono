<template>
  <div class="page">
    <Card class="calendar-card">
      <template #title>
        <div class="card-header">
          <span>{{ $t('planning.title') }}</span>
          <div class="card-header-actions">
            <SelectButton
              v-if="isTeacher && !isAdmin"
              v-model="teacherView"
              :options="teacherViewOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              :aria-label="$t('planning.view_mode')"
            />
            <Select
              v-if="showClassSelect"
              v-model="selectedClassId"
              :options="classSelectOptions"
              option-label="label"
              option-value="value"
              :placeholder="$t('planning.all_classes')"
              :show-clear="isAdmin"
              class="filter-select"
            />
            <Select
              v-if="isAdmin && selectedClassId"
              v-model="selectedStudentId"
              :options="studentOptions"
              option-label="label"
              option-value="value"
              :placeholder="$t('planning.all_students')"
              :aria-label="$t('planning.student_filter')"
              show-clear
              class="filter-select"
            />
            <Select
              v-if="isAdmin"
              v-model="selectedTeacherId"
              :options="teacherOptions"
              option-label="label"
              option-value="value"
              :placeholder="$t('planning.all_teachers')"
              :aria-label="$t('planning.teacher_filter')"
              show-clear
              class="filter-select"
            />
            <Button
              v-if="canEdit"
              :label="$t('planning.add')"
              icon="pi pi-plus"
              size="small"
              @click="openCreateDialog(null)"
            />
          </div>
        </div>
      </template>
      <template #content>
        <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

        <div v-else-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>{{ $t('planning.loading') }}</span>
        </div>

        <PlanningWeeklyCalendar
          v-else
          :sessions="sessions"
          :course-names="courseNames"
          :teacher-names="teacherNames"
          :can-edit="canEdit"
          :current-user-id="userId"
          @session-click="openEditDialog"
          @slot-click="openCreateDialog"
        />
      </template>
    </Card>

    <PlanningSessionDialog
      v-model:visible="sessionDialogVisible"
      :session="activeSession"
      :classes="classes"
      :initial-date="slotDate"
      @saved="refresh"
    />

    <PlanningAbsenceDialog
      v-model:visible="absenceDialogVisible"
      :session="activeSession"
      @saved="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError, type SkolrClass, type ClassesApiResponse } from '~/composables/useClass';
import type { CourseListApiResponse } from '~/composables/useGrade';
import type { Session, SessionFilters } from '~/composables/usePlanning';
import type { UserProfile } from '~/composables/useUser';

definePageMeta({ middleware: ['auth'] });
defineExpose({ removeSession });

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useApi();
const { hasRole, userId } = useAuth();
const { fetchSessions, deleteSession } = usePlanning();
const { fetchUsersByIds, fetchAllUsers } = useUser();
const { fetchClassesByTeacherId } = useClass();

const isAdmin = computed(() => hasRole('ADMIN'));
const isTeacher = computed(() => hasRole('TEACHER', 'STAFF'));
const isStudent = computed(() => hasRole('USER'));
const canEdit = computed(() => isAdmin.value || isTeacher.value);

// Vue enseignant : « Mes matières » (défaut) ou « Vue classe ». Deep-link ?view=mine|class.
const initialView = route.query.view;
const teacherView = ref<'mine' | 'class'>(initialView === 'class' ? 'class' : 'mine');
const teacherViewOptions = computed(() => [
  { label: t('planning.view_mine'), value: 'mine' },
  { label: t('planning.view_class'), value: 'class' },
]);

// Filtres — deep-links ?classId=&teacherId=
const selectedClassId = ref<string | null>(
  typeof route.query.classId === 'string' ? route.query.classId : null,
);
const selectedStudentId = ref<string | null>(null);
const selectedTeacherId = ref<string | null>(
  typeof route.query.teacherId === 'string' ? route.query.teacherId : null,
);

// Charger les classes (pour le select admin + le dialog)
const { data: classesResponse } = await useFetch<ClassesApiResponse>('/class/classes', {
  $fetch: api,
  default: () => ({ data: [] as SkolrClass[], message: '' }),
});
const classes = computed(() => classesResponse.value?.data ?? []);
const classOptions = computed(() => classes.value.map((c) => ({ label: c.name, value: c.id })));
const selectedClass = computed(
  () => classes.value.find((c) => c.id === selectedClassId.value) ?? null,
);

// Classes où le prof connecté enseigne (select « Vue classe »).
const teacherClasses = ref<SkolrClass[]>([]);
const teacherClassOptions = computed(() =>
  teacherClasses.value.map((c) => ({ label: c.name, value: c.id })),
);

// Professeurs (filtre admin).
const allTeachers = ref<UserProfile[]>([]);
const teacherOptions = computed(() =>
  allTeachers.value.map((u) => ({ label: u.name ?? u.email, value: u.id })),
);

onMounted(async () => {
  if (isTeacher.value && !isAdmin.value && userId.value) {
    try {
      teacherClasses.value = await fetchClassesByTeacherId(userId.value);
    } catch {
      teacherClasses.value = [];
    }
  }
  if (isAdmin.value) {
    try {
      const users = await fetchAllUsers();
      allTeachers.value = users.filter((u) => u.role === 'TEACHER' || u.role === 'STAFF');
    } catch {
      allTeachers.value = [];
    }
  }
});

// Le select de classe s'affiche pour l'admin (toutes les classes) ou pour le prof en « Vue classe » (ses classes).
const showClassSelect = computed(
  () => isAdmin.value || (isTeacher.value && !isAdmin.value && teacherView.value === 'class'),
);
const classSelectOptions = computed(() =>
  isAdmin.value ? classOptions.value : teacherClassOptions.value,
);

// Passer en « Vue classe » sans classe choisie → présélectionner la première classe du prof.
watch([teacherView, teacherClassOptions], ([view, options]) => {
  if (view === 'class' && !selectedClassId.value && options.length > 0) {
    selectedClassId.value = options[0]!.value;
  }
});

// Noms des élèves de la classe sélectionnée (pour peupler le select élève)
const studentProfiles = ref<{ id: string; name: string | null; email: string }[]>([]);
watch(selectedClass, async (cls) => {
  selectedStudentId.value = null;
  const studentIds = cls?.students?.map((s) => s.studentId) ?? [];
  if (studentIds.length === 0) {
    studentProfiles.value = [];
    return;
  }
  try {
    studentProfiles.value = await fetchUsersByIds(studentIds);
  } catch {
    // non-bloquant : le select élève sera vide si le fetch échoue
    studentProfiles.value = [];
  }
});
const studentOptions = computed(() =>
  studentProfiles.value.map((p) => ({ label: p.name ?? p.email, value: p.id })),
);

// Noms des matières (grade-service)
const { data: coursesResponse } = await useFetch<CourseListApiResponse>('/grade/courses', {
  $fetch: api,
  default: () => ({ data: [], message: '' }),
});
const courseNames = computed(
  () => new Map((coursesResponse.value?.data ?? []).map((c) => [c.id, c.name])),
);

// Noms des professeurs — chargés dynamiquement depuis les sessions
const teacherProfiles = ref<{ id: string; name: string | null; email: string }[]>([]);
const teacherNames = computed(
  () => new Map(teacherProfiles.value.map((t) => [t.id, t.name ?? t.email])),
);

// Construire les filtres selon le rôle. Le RBAC est appliqué côté serveur (issue #77) :
// l'élève/parent sont restreints à leurs classes, le prof à son scope — le front ne fait
// qu'exprimer l'intention de vue.
const filters = computed<SessionFilters>(() => {
  if (isStudent.value) {
    // L'élève ne voit que les séances de ses classes (résolues côté serveur).
    return {};
  }
  if (isTeacher.value && !isAdmin.value) {
    if (teacherView.value === 'class' && selectedClassId.value) {
      return { scope: 'class', classId: selectedClassId.value };
    }
    return { scope: 'mine' };
  }
  // Admin : filtres libres et combinables.
  return {
    ...(selectedClassId.value && { classId: selectedClassId.value }),
    ...(selectedStudentId.value && { studentId: selectedStudentId.value }),
    ...(selectedTeacherId.value && { teacherId: selectedTeacherId.value }),
  };
});

// Synchroniser l'état des filtres avec l'URL (deep links partageables).
watch([teacherView, selectedClassId, selectedTeacherId], ([view, classId, teacherId]) => {
  if (import.meta.server) return;
  const nextQuery = { ...route.query };
  if (isTeacher.value && !isAdmin.value) nextQuery.view = view;
  else delete nextQuery.view;
  if (classId) nextQuery.classId = classId;
  else delete nextQuery.classId;
  if (isAdmin.value && teacherId) nextQuery.teacherId = teacherId;
  else delete nextQuery.teacherId;
  router.replace({ query: nextQuery });
});

const sessions = ref<Session[]>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);

async function refresh() {
  pending.value = true;
  fetchError.value = null;
  try {
    sessions.value = await fetchSessions(filters.value);
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

watch(filters, refresh, { immediate: true });

// Quand les sessions changent, résoudre les noms des profs
watch(sessions, async (newSessions) => {
  const ids = [...new Set(newSessions.map((s) => s.teacherId))];
  if (ids.length === 0) return;
  try {
    teacherProfiles.value = await fetchUsersByIds(ids);
  } catch {
    // non-bloquant : le calendrier affichera juste l'ID si le fetch échoue
  }
});

// Dialogs
const sessionDialogVisible = ref(false);
const absenceDialogVisible = ref(false);
const activeSession = ref<Session | null>(null);
const slotDate = ref<Date | null>(null);

function openEditDialog(session: Session) {
  activeSession.value = session;
  slotDate.value = null;
  if (canEdit.value) {
    sessionDialogVisible.value = true;
  } else {
    // Élève ou visiteur : déclarer une absence sur cette session
    absenceDialogVisible.value = true;
  }
}

function openCreateDialog(date: Date | null) {
  activeSession.value = null;
  slotDate.value = date;
  sessionDialogVisible.value = true;
}

// Suppression accessible depuis le dialog via event futur
async function removeSession(id: string) {
  try {
    await deleteSession(id);
    await refresh();
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  }
}

</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page :deep(.p-card) {
  flex: 1 1 100%;
}

.calendar-card {
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.card-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-select {
  width: 14rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>

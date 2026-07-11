<template>
  <div class="attendance-roster">
    <div v-if="sessionOptions.length > 0" class="roster-toolbar">
      <Select
        v-model="selectedSessionId"
        :options="sessionOptions"
        option-label="label"
        option-value="value"
        class="session-select"
      />
    </div>

    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <p v-else-if="sessionOptions.length === 0" class="empty">{{ $t('planning.absences.roster.no_sessions') }}</p>

    <template v-else>
      <div class="kpi-row">
        <KpiCard :value="presentCount" :label="$t('planning.absences.roster.present')" />
        <KpiCard :value="absentCount" :label="$t('planning.absences.roster.absent')" variant="accent" />
      </div>

      <div class="roster-rows">
        <div v-for="row in roster" :key="row.userId" class="roster-row">
          <span class="roster-name">{{ row.name }}</span>
          <SelectButton
            :model-value="row.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="row.saving"
            @update:model-value="(status) => toggle(row, status)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import KpiCard from '~/components/ui/KpiCard.vue';

type RosterStatus = 'PRESENT' | 'ABSENT';

type RosterRow = {
  userId: string;
  name: string;
  status: RosterStatus;
  absenceId: string | null;
  saving: boolean;
};

const { t } = useI18n();
const { hasRole } = useAuth();
const { fetchSessions, fetchAbsences, createAbsence, deleteAbsence } = usePlanning();
const { fetchClassById } = useClass();
const { fetchCourses } = useGrade();
const { fetchUsersByIds } = useUser();
const { setPageHeader } = usePageHeader();

const isAdmin = computed(() => hasRole('ADMIN'));

const statusOptions = computed(() => [
  { label: t('planning.absences.roster.present'), value: 'PRESENT' as const },
  { label: t('planning.absences.roster.absent'), value: 'ABSENT' as const },
]);

type SessionOption = {
  label: string;
  value: string;
  classId: string;
  className: string;
  courseName: string;
  room: string | null;
};

const sessionOptions = ref<SessionOption[]>([]);
const selectedSessionId = ref<string | null>(null);
const roster = ref<RosterRow[]>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);

async function loadSessions() {
  pending.value = true;
  fetchError.value = null;
  try {
    const [sessions, courses] = await Promise.all([
      fetchSessions(isAdmin.value ? {} : { scope: 'mine' }),
      fetchCourses(),
    ]);
    const courseNameById = new Map(courses.map((c) => [c.id, c.name]));
    const classIds = [...new Set(sessions.map((s) => s.classId))];
    const classes = await Promise.all(classIds.map((id) => fetchClassById(id)));
    const classNameById = new Map(classes.map((c) => [c.id, c.name]));

    const now = new Date();
    const todaysSessions = sessions
      .filter((s) => new Date(s.startAt).toDateString() === now.toDateString())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    sessionOptions.value = todaysSessions.map((s) => {
      const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(s.startAt),
      );
      const className = classNameById.get(s.classId) ?? '';
      const courseName = courseNameById.get(s.courseId) ?? '';
      return {
        label: `${time} — ${className} — ${courseName}`,
        value: s.id,
        classId: s.classId,
        className,
        courseName,
        room: s.room,
      };
    });

    if (sessionOptions.value.length > 0) {
      // Sélectionne la session la plus proche de maintenant par défaut.
      const current =
        sessionOptions.value.find((_, i) => new Date(todaysSessions[i]!.endAt) > now) ?? sessionOptions.value[0]!;
      selectedSessionId.value = current.value;
    }
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

async function loadRoster(sessionId: string) {
  pending.value = true;
  fetchError.value = null;
  try {
    const session = sessionOptions.value.find((s) => s.value === sessionId);
    if (!session) {
      roster.value = [];
      return;
    }
    const [cls, absences] = await Promise.all([
      fetchClassById(session.classId),
      fetchAbsences({ sessionId, role: 'STUDENT' }),
    ]);
    const studentIds = cls.students?.map((s) => s.studentId) ?? [];
    const profiles = await fetchUsersByIds(studentIds);
    const nameById = new Map(profiles.map((p) => [p.id, p.name?.trim() || p.email]));
    const absenceByUserId = new Map(absences.map((a) => [a.userId, a]));

    roster.value = studentIds
      .map((id) => {
        const absence = absenceByUserId.get(id);
        return {
          userId: id,
          name: nameById.get(id) ?? id,
          status: absence ? ('ABSENT' as const) : ('PRESENT' as const),
          absenceId: absence?.id ?? null,
          saving: false,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    setPageHeader({
      title: `${session.className} — ${session.courseName}${session.room ? `, ${session.room}` : ''}`,
      subtitle: t('planning.absences.roster.subtitle', { count: roster.value.length }),
    });
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

async function toggle(row: RosterRow, status: RosterStatus) {
  if (status === row.status || !selectedSessionId.value) return;
  const previous = row.status;
  row.saving = true;
  try {
    if (status === 'ABSENT') {
      const absence = await createAbsence({
        sessionId: selectedSessionId.value,
        userId: row.userId,
        role: 'STUDENT',
        justified: false,
      });
      row.absenceId = absence.id;
    } else if (row.absenceId) {
      await deleteAbsence(row.absenceId);
      row.absenceId = null;
    }
    row.status = status;
  } catch (e) {
    row.status = previous;
    fetchError.value = normalizeApiError(e);
  } finally {
    row.saving = false;
  }
}

const presentCount = computed(() => roster.value.filter((r) => r.status === 'PRESENT').length);
const absentCount = computed(() => roster.value.filter((r) => r.status === 'ABSENT').length);

watch(selectedSessionId, (id) => {
  if (id) void loadRoster(id);
});

onMounted(loadSessions);
</script>

<style scoped>
.attendance-roster {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.roster-toolbar {
  display: flex;
  justify-content: flex-end;
}

.session-select {
  min-width: 20rem;
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
}

.roster-rows {
  display: flex;
  flex-direction: column;
}

.roster-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--skolr-color-divider);
}

.roster-row:last-child {
  border-bottom: none;
}

.roster-name {
  font-size: 14px;
}
</style>

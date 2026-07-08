<template>
  <div class="sessions-widget">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="widget-loading">
      <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="sessions.length === 0" class="widget-empty">
      <p>{{ $t('teacher.dashboard.no_sessions_today') }}</p>
    </div>

    <ul v-else class="session-list">
      <li v-for="session in sessions" :key="session.id" class="session-item">
        <span class="session-time">{{ formatTime(session.startAt) }} – {{ formatTime(session.endAt) }}</span>
        <span class="session-detail">{{ classNames[session.classId] ?? session.classId }}</span>
        <span class="session-detail">{{ courseNames[session.courseId] ?? '' }}</span>
        <span v-if="session.room" class="session-room">{{ session.room }}</span>
      </li>
    </ul>

    <div class="widget-footer">
      <NuxtLink to="/planning" class="widget-link">{{ $t('teacher.dashboard.see_planning') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { Session } from '~/composables/usePlanning';

const { fetchSessions } = usePlanning();
const { fetchClassesByTeacherId, fetchTeacherCourses } = useClass();
const { userId } = useAuth();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const sessions = ref<Session[]>([]);
const classNames = ref<Record<string, string>>({});
const courseNames = ref<Record<string, string>>({});

onMounted(async () => {
  if (!userId.value) {
    pending.value = false;
    return;
  }

  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [todaySessions, classes] = await Promise.all([
      fetchSessions({ teacherId: userId.value, from: start.toISOString(), to: end.toISOString() }),
      fetchClassesByTeacherId(userId.value),
    ]);

    sessions.value = todaySessions.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    classNames.value = Object.fromEntries(classes.map((c) => [c.id, c.name]));

    const uniqueClassIds = [...new Set(sessions.value.map((s) => s.classId))];
    const coursesByClass = await Promise.all(
      uniqueClassIds.map((classId) => fetchTeacherCourses(classId, userId.value!)),
    );
    courseNames.value = Object.fromEntries(coursesByClass.flat().map((c) => [c.id, c.name]));
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.sessions-widget {
  display: grid;
  gap: 0.75rem;
}

.widget-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 4rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.widget-empty {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  padding: 0.5rem 0;
}

.widget-empty p {
  margin: 0;
}

.session-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.session-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--p-surface-100, var(--skolr-color-border));
  font-size: 0.9rem;
}

.session-item:last-child {
  border-bottom: none;
}

.session-time {
  font-weight: 600;
  color: var(--p-text-color, inherit);
}

.session-detail {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.session-room {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.widget-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.widget-link {
  font-size: 0.9rem;
  color: var(--p-primary-color, var(--skolr-color-brand-green));
  text-decoration: none;
}

.widget-link:hover {
  text-decoration: underline;
}
</style>

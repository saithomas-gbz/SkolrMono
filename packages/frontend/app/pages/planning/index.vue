<template>
  <div class="page">
    <Card class="calendar-card">
      <template #title>
        <div class="card-header">
          <span>Emploi du temps</span>
          <div class="card-header-actions">
            <Select
              v-if="isAdmin"
              v-model="selectedClassId"
              :options="classOptions"
              option-label="label"
              option-value="value"
              placeholder="Toutes les classes"
              show-clear
              class="filter-select"
            />
            <Button
              v-if="canEdit"
              label="Ajouter"
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
          <span>Chargement…</span>
        </div>

        <PlanningWeeklyCalendar
          v-else
          :sessions="sessions"
          :can-edit="canEdit"
          @session-click="openEditDialog"
          @slot-click="openCreateDialog"
        />
      </template>
    </Card>

    <PlanningSessionDialog
      v-model:visible="dialogVisible"
      :session="activeSession"
      :classes="classes"
      :initial-date="slotDate"
      @saved="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError, type SkolrClass, type ClassesApiResponse } from '~/composables/useClass';
import type { Session } from '~/composables/usePlanning';

definePageMeta({ middleware: ['auth'] });

const api = useApi();
const { hasRole, userId } = useAuth();
const { fetchSessions, deleteSession } = usePlanning();

const isAdmin = computed(() => hasRole('ADMIN'));
const isTeacher = computed(() => hasRole('TEACHER', 'STAFF'));
const isStudent = computed(() => hasRole('USER'));
const canEdit = computed(() => isAdmin.value || isTeacher.value);

// Filtre de classe (admin uniquement)
const selectedClassId = ref<string | null>(null);

// Charger les classes (pour le select admin + le dialog)
const { data: classesResponse } = await useFetch<ClassesApiResponse>('/class/classes', {
  $fetch: api,
  default: () => ({ data: [] as SkolrClass[], message: '' }),
});
const classes = computed(() => classesResponse.value?.data ?? []);
const classOptions = computed(() => classes.value.map((c) => ({ label: c.name, value: c.id })));

// Construire les filtres selon le rôle
const filters = computed(() => {
  if (isStudent.value) {
    // L'élève voit les sessions de sa classe — on récupère son classId depuis le service class
    return {};
  }
  if (isTeacher.value && !isAdmin.value) {
    return { teacherId: userId.value ?? undefined };
  }
  if (isAdmin.value && selectedClassId.value) {
    return { classId: selectedClassId.value };
  }
  return {};
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

// Dialog create/edit
const dialogVisible = ref(false);
const activeSession = ref<Session | null>(null);
const slotDate = ref<Date | null>(null);

function openEditDialog(session: Session) {
  activeSession.value = session;
  slotDate.value = null;
  dialogVisible.value = true;
}

function openCreateDialog(date: Date | null) {
  activeSession.value = null;
  slotDate.value = date;
  dialogVisible.value = true;
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

defineExpose({ removeSession });
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
  color: var(--p-text-muted-color, #64748b);
}
</style>

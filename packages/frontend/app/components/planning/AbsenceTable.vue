<template>
  <div class="absence-table">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="rows.length === 0" class="empty">
      <p>{{ $t('planning.absences.no_absences') }}</p>
    </div>

    <DataTable
      v-else
      :value="rows"
      data-key="id"
      responsive-layout="scroll"
      sort-field="createdAt"
      :sort-order="-1"
      removable-sort
      class="table"
    >
      <Column field="sessionDate" :header="$t('planning.absences.session')" sortable>
        <template #body="{ data }">{{ data.sessionDate }}</template>
      </Column>
      <Column field="cours" :header="$t('planning.absences.course')" sortable>
        <template #body="{ data }">{{ data.cours }}</template>
      </Column>
      <Column field="userId" :header="$t('planning.absences.user_id')">
        <template #body="{ data }">{{ resolveUserName(data.userId) }}</template>
      </Column>
      <Column field="justified" :header="$t('planning.absences.justified')" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.justified ? $t('common.yes') : $t('common.no')"
            :severity="data.justified ? 'success' : 'warn'"
          />
        </template>
      </Column>
      <Column field="reason" :header="$t('planning.absences.reason')">
        <template #body="{ data }">{{ data.reason ?? '—' }}</template>
      </Column>
      <Column :header="$t('common.actions')">
        <template #body="{ data }">
          <div class="row-actions">
            <Button
              v-if="!data.justified"
              :label="$t('planning.absences.justify')"
              icon="pi pi-check"
              size="small"
              severity="success"
              outlined
              @click="justify(data.id)"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              severity="danger"
              text
              :aria-label="$t('planning.absences.delete')"
              @click="remove(data.id)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { AbsenceFilters } from '~/composables/usePlanning';
import type { UserProfile } from '~/composables/useUser';

const props = defineProps<{ filters?: AbsenceFilters }>();

const { fetchAbsences, justifyAbsence, deleteAbsence, fetchSessions } = usePlanning();
const { fetchUsersByIds } = useUser();
const { fetchClasses, fetchAssignableCourses } = useClass();

type Row = {
  id: string;
  sessionId: string;
  sessionDate: string;
  cours: string;
  userId: string;
  justified: boolean;
  reason: string | null;
  createdAt: string;
};

const rawAbsences = ref<Awaited<ReturnType<typeof fetchAbsences>>>([]);
const userProfiles = ref(new Map<string, UserProfile>());
// Une absence ne porte qu'un `sessionId` : sans ces trois tables, la ligne ne
// peut dire ni quand la séance avait lieu, ni de quel cours il s'agissait.
const sessions = ref(new Map<string, { startAt: string; classId: string; courseId: string; room: string | null }>());
const nomsClasses = ref(new Map<string, string>());
const nomsCours = ref(new Map<string, string>());
const pending = ref(true);
const fetchError = ref<string | null>(null);

async function load() {
  pending.value = true;
  fetchError.value = null;
  try {
    rawAbsences.value = await fetchAbsences(props.filters);
    const [profiles, listeSessions, classes, cours] = await Promise.all([
      fetchUsersByIds(rawAbsences.value.map((a) => a.userId)),
      fetchSessions().catch(() => []),
      fetchClasses().catch(() => []),
      fetchAssignableCourses().catch(() => []),
    ]);
    profiles.forEach((p) => userProfiles.value.set(p.id, p));
    sessions.value = new Map(listeSessions.map((s) => [s.id, s]));
    nomsClasses.value = new Map(classes.map((c) => [c.id, c.name]));
    nomsCours.value = new Map(cours.map((c) => [c.id, c.name]));
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

function resolveUserName(userId: string): string {
  const profile = userProfiles.value.get(userId);
  return profile?.name?.trim() || profile?.email || userId;
}

watch(() => props.filters, load, { immediate: true, deep: true });

/** « CM2-A · Mathématiques », en dégradant sur ce qui est connu. */
function libelleCours(sessionId: string): string {
  const s = sessions.value.get(sessionId);
  if (!s) return '—';
  const parts = [nomsClasses.value.get(s.classId), nomsCours.value.get(s.courseId)].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : (s.room ?? '—');
}

const rows = computed<Row[]>(() =>
  rawAbsences.value.map((a) => ({
    id: a.id,
    sessionId: a.sessionId,
    // La colonne affichait `createdAt`, la date d'enregistrement de l'absence,
    // sous un en-tête « Séance » : deux absences posées d'un coup sur des cours
    // de 10h et 12h s'affichaient à la même heure, celle de la saisie. On montre
    // désormais l'horaire réel de la séance, et on ne retombe sur `createdAt`
    // que si la séance est introuvable.
    sessionDate: formatDatetime(sessions.value.get(a.sessionId)?.startAt ?? a.createdAt),
    cours: libelleCours(a.sessionId),
    userId: a.userId,
    justified: a.justified,
    reason: a.reason,
    createdAt: a.createdAt,
  })),
);

async function justify(id: string) {
  try {
    await justifyAbsence(id);
    await load();
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  }
}

async function remove(id: string) {
  try {
    await deleteAbsence(id);
    await load();
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  }
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
</script>

<style scoped>
.absence-table {
  display: grid;
  gap: 0.75rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.empty {
  min-height: 6rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.empty p {
  margin: 0;
}

.row-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.table {
  font-size: 0.9rem;
}
</style>

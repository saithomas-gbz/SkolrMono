<template>
  <div class="absence-table">
    <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

    <div v-else-if="pending" class="loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>Chargement…</span>
    </div>

    <div v-else-if="rows.length === 0" class="empty">
      <p>Aucune absence enregistrée.</p>
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
      <Column field="sessionDate" header="Session" sortable>
        <template #body="{ data }">{{ data.sessionDate }}</template>
      </Column>
      <Column field="userId" header="Utilisateur (ID)" />
      <Column field="justified" header="Justifiée" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.justified ? 'Oui' : 'Non'"
            :severity="data.justified ? 'success' : 'warn'"
          />
        </template>
      </Column>
      <Column field="reason" header="Motif">
        <template #body="{ data }">{{ data.reason ?? '—' }}</template>
      </Column>
      <Column header="Actions">
        <template #body="{ data }">
          <div class="row-actions">
            <Button
              v-if="!data.justified"
              label="Justifier"
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
              aria-label="Supprimer"
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

const props = defineProps<{ filters?: AbsenceFilters }>();

const { fetchAbsences, justifyAbsence, deleteAbsence } = usePlanning();

type Row = {
  id: string;
  sessionId: string;
  sessionDate: string;
  userId: string;
  justified: boolean;
  reason: string | null;
  createdAt: string;
};

const rawAbsences = ref<Awaited<ReturnType<typeof fetchAbsences>>>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);

async function load() {
  pending.value = true;
  fetchError.value = null;
  try {
    rawAbsences.value = await fetchAbsences(props.filters);
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

watch(() => props.filters, load, { immediate: true, deep: true });

const rows = computed<Row[]>(() =>
  rawAbsences.value.map((a) => ({
    id: a.id,
    sessionId: a.sessionId,
    sessionDate: formatDatetime(a.createdAt),
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
  color: var(--p-text-muted-color, #64748b);
}

.empty {
  min-height: 6rem;
  color: var(--p-text-muted-color, #64748b);
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

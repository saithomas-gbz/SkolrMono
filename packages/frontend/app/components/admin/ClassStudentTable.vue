<template>
  <div class="admin-class-student-table">
    <Message v-if="fetchError" severity="error" :closable="false" class="table-message">
      {{ fetchError }}
    </Message>

    <div v-else-if="pending" class="table-loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>Chargement des classes…</span>
    </div>

    <div v-else-if="classes.length === 0" class="table-empty">
      <p>Aucune classe dans l'établissement.</p>
    </div>

    <template v-else>
      <div class="table-toolbar">
        <label for="admin-class-select" class="toolbar-label">Classe</label>
        <Select
          id="admin-class-select"
          v-model="selectedClassId"
          :options="classOptions"
          option-label="label"
          option-value="value"
          placeholder="Choisir une classe"
        />
      </div>

      <Message v-if="studentsError" severity="error" :closable="false" class="table-message">
        {{ studentsError }}
      </Message>

      <div v-else-if="studentsPending" class="table-loading">
        <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
        <span>Chargement des élèves…</span>
      </div>

      <div v-else-if="rows.length === 0" class="table-empty">
        <p>Aucun élève dans cette classe.</p>
      </div>

      <DataTable
        v-else
        :value="rows"
        data-key="studentId"
        responsive-layout="scroll"
        class="students-table"
        sort-field="name"
        :sort-order="1"
        removable-sort
      >
        <Column field="name" header="Nom" sortable />
        <Column field="email" header="Email" sortable />
        <Column field="joinedAt" header="Inscrit le" sortable>
          <template #body="{ data }">
            {{ formatDate(data.joinedAt) }}
          </template>
        </Column>
      </DataTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError, type SkolrClass } from '~/composables/useClass';
import type { UserProfile } from '~/composables/useUser';

type StudentRow = {
  studentId: string;
  name: string;
  email: string;
  joinedAt: string | null;
};

const props = defineProps<{
  initialClassId?: string;
}>();

const route = useRoute();
const router = useRouter();
const { fetchClasses } = useClass();
const { fetchUsersByIds } = useUser();

const pending = ref(true);
const fetchError = ref<string | null>(null);
const classes = ref<SkolrClass[]>([]);

const classOptions = computed(() =>
  classes.value.map((cls) => ({ label: cls.name, value: cls.id })),
);

function resolveInitialClassId(): string | null {
  const fromProp = props.initialClassId?.trim();
  if (fromProp) return fromProp;
  const q = route.query.classId;
  if (typeof q === 'string' && q.trim()) return q.trim();
  return null;
}

const selectedClassId = ref<string | null>(resolveInitialClassId());

onMounted(async () => {
  try {
    classes.value = await fetchClasses();
    const preferred = resolveInitialClassId();
    const stillValid = classes.value.some((c) => c.id === selectedClassId.value);
    if (preferred && classes.value.some((c) => c.id === preferred)) {
      selectedClassId.value = preferred;
    } else if (!selectedClassId.value || !stillValid) {
      selectedClassId.value = classes.value[0]?.id ?? null;
    }
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});

watch(selectedClassId, (id) => {
  if (import.meta.server) return;
  const current = typeof route.query.classId === 'string' ? route.query.classId : null;
  if (id === current) return;
  const nextQuery = { ...route.query };
  if (id) {
    nextQuery.classId = id;
  } else {
    delete nextQuery.classId;
  }
  router.replace({ query: nextQuery });
});

const selectedClass = computed(
  () => classes.value.find((cls) => cls.id === selectedClassId.value) ?? null,
);

const rows = ref<StudentRow[]>([]);
const studentsPending = ref(false);
const studentsError = ref<string | null>(null);

async function loadStudents(cls: SkolrClass | null) {
  studentsError.value = null;
  const enrollments = cls?.students ?? [];
  if (enrollments.length === 0) {
    rows.value = [];
    return;
  }

  studentsPending.value = true;
  try {
    const profiles = await fetchUsersByIds(enrollments.map((s) => s.studentId));
    const byId = new Map<string, UserProfile>(profiles.map((p) => [p.id, p]));
    rows.value = enrollments.map((enrollment) => {
      const profile = byId.get(enrollment.studentId);
      return {
        studentId: enrollment.studentId,
        name: profile?.name ?? '—',
        email: profile?.email ?? '—',
        joinedAt: enrollment.joinedAt ?? null,
      };
    });
  } catch (e) {
    studentsError.value = normalizeApiError(e);
    rows.value = [];
  } finally {
    studentsPending.value = false;
  }
}

watch(selectedClass, (cls) => void loadStudents(cls), { immediate: true });

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
}
</script>

<style scoped>
.admin-class-student-table {
  display: grid;
  gap: 0.75rem;
}

.table-message {
  margin: 0;
}

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.toolbar-label {
  font-weight: 600;
  font-size: 0.9rem;
}

.table-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, #64748b);
}

.table-empty {
  padding: 0.5rem 0;
  min-height: 6rem;
  color: var(--p-text-muted-color, #64748b);
}

.table-empty p {
  margin: 0;
}

.students-table {
  font-size: 0.9rem;
}
</style>

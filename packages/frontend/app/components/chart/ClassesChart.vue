<template>
  <div class="classes-overview">
    <Message v-if="fetchError" severity="error" :closable="false" class="overview-message">
      {{ fetchError }}
    </Message>

    <div v-else-if="pending" class="overview-loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>Chargement des classes…</span>
    </div>

    <div v-else-if="classes.length === 0" class="overview-empty">
      <p>Aucune classe en base pour le moment.</p>
      <p class="overview-empty-hint">
        Lancez <code>bun run seed:dev</code> à la racine du monorepo ou créez une classe via l’API.
      </p>
    </div>

    <ul v-else class="class-items">
      <li v-for="cls in classes" :key="cls.id">
        <NuxtLink :to="classLink(cls.id)" class="class-item">
          <span class="class-name">{{ cls.name }}</span>
          <div class="class-meta">
            <Tag :value="teacherCountLabel(cls.teacherCount)" severity="secondary" class="meta-tag" />
            <Tag :value="studentCountLabel(cls.studentCount)" severity="info" class="meta-tag" />
          </div>
          <i class="pi pi-angle-right class-arrow" />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import {
  normalizeApiError,
  type ClassesSummaryApiResponse,
  type SkolrClassSummary,
} from '~/composables/useClass';

const { t } = useI18n();
const api = useApi();
const { hasRole } = useAuth();

const {
  data: summaryResponse,
  pending,
  error: summaryError,
} = await useFetch<ClassesSummaryApiResponse>('/class/classes/summary', {
  $fetch: api,
  default: () => ({ data: [] as SkolrClassSummary[], message: '' }),
});

const classes = computed(() => summaryResponse.value?.data ?? []);

const fetchError = computed(() =>
  summaryError.value ? normalizeApiError(summaryError.value) : null,
);

const studentsBasePath = computed(() => (hasRole('ADMIN') ? '/admin/students' : '/teacher/students'));

function classLink(classId: string) {
  return { path: studentsBasePath.value, query: { classId } };
}

function teacherCountLabel(n: number): string {
  return t('common.teacher_count', { count: n }, n);
}

function studentCountLabel(n: number): string {
  return t('common.student_count', { count: n }, n);
}
</script>

<style scoped>
.classes-overview {
  display: grid;
  gap: 1rem;
}

.overview-message {
  margin: 0;
}

.overview-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.overview-empty {
  padding: 0.5rem 0;
  min-height: 8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.overview-empty p {
  margin: 0 0 0.5rem;
}

.overview-empty-hint {
  font-size: 0.9rem;
}

.overview-empty-hint code {
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  background: var(--p-surface-100, var(--skolr-color-surface-hover));
}

.class-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-200, var(--skolr-color-border));
  background: var(--p-surface-50, var(--skolr-color-surface-hover));
  color: inherit;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.class-item:hover {
  background: var(--skolr-color-surface-hover);
}

.class-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.class-meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-left: auto;
}

.meta-tag {
  font-size: 0.75rem;
}

.class-arrow {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>

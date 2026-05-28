<template>
  <div class="student-class-list">
    <Message v-if="fetchError" severity="error" :closable="false" class="list-message">
      {{ fetchError }}
    </Message>

    <div v-else-if="pending" class="list-loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
      <span>Chargement de vos classes…</span>
    </div>

    <div v-else-if="!userId" class="list-empty">
      <p>Session invalide : identifiant utilisateur manquant.</p>
    </div>

    <div v-else-if="classes.length === 0" class="list-empty">
      <p>Vous n'êtes inscrit(e) dans aucune classe.</p>
      <p class="list-empty-hint">Contactez un administrateur si c'est une erreur.</p>
    </div>

    <ul v-else class="class-items">
      <li v-for="cls in classes" :key="cls.id" class="class-item">
        <span class="class-name">{{ cls.name }}</span>
        <span v-if="cls.description" class="class-desc">{{ cls.description }}</span>
        <div class="class-meta">
          <Tag
            :value="`${cls.classTeachers?.length ?? 0} prof${(cls.classTeachers?.length ?? 0) !== 1 ? 's' : ''}`"
            severity="secondary"
            class="meta-tag"
          />
          <Tag
            :value="`${cls.students?.length ?? 0} élève${(cls.students?.length ?? 0) !== 1 ? 's' : ''}`"
            severity="info"
            class="meta-tag"
          />
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError, type SkolrClass, type ClassesApiResponse } from '~/composables/useClass';

const api = useApi();
const { userId } = useAuth();

const classesUrl = computed(() =>
  userId.value ? `/class/classes/student/${userId.value}` : null,
);

const {
  data: classesResponse,
  pending,
  error: classesError,
} = await useFetch<ClassesApiResponse>(() => classesUrl.value, {
  $fetch: api,
  watch: [classesUrl],
  immediate: true,
  default: () => ({ data: [] as SkolrClass[], message: '' }),
});

const classes = computed(() => classesResponse.value?.data ?? []);

const fetchError = computed(() =>
  classesError.value ? normalizeApiError(classesError.value) : null,
);
</script>

<style scoped>
.student-class-list {
  display: grid;
  gap: 0.75rem;
}

.list-message {
  margin: 0;
}

.list-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, #64748b);
}

.list-empty {
  padding: 0.5rem 0;
  min-height: 6rem;
  color: var(--p-text-muted-color, #64748b);
}

.list-empty p {
  margin: 0 0 0.4rem;
}

.list-empty-hint {
  font-size: 0.9rem;
}

.class-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.class-item {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-200, #e2e8f0);
  background: var(--p-surface-50, #f8fafc);
}

.class-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.class-desc {
  font-size: 0.85rem;
  color: var(--p-text-muted-color, #64748b);
}

.class-meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.meta-tag {
  font-size: 0.75rem;
}
</style>

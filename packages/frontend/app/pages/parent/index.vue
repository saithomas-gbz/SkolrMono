<template>
  <div class="page">
    <Card>
      <template #title>{{ $t('parent.dashboard_title') }}</template>
      <template #content>
        <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

        <div v-else-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>{{ $t('common.loading') }}</span>
        </div>

        <div v-else-if="children.length === 0" class="empty">
          <p>{{ $t('parent.no_children') }}</p>
        </div>

        <div v-else class="children-grid">
          <Card
            v-for="child in children"
            :key="child.studentId"
            class="child-card"
            @click="selectChild(child.studentId)"
          >
            <template #title>{{ child.student?.name ?? child.studentId }}</template>
            <template #subtitle>{{ classNames[child.studentId] ?? '' }}</template>
            <template #content>
              <div class="child-actions">
                <Button :label="$t('parent.see_absences')" size="small" outlined @click.stop="goTo('/parent/absences', child.studentId)" />
                <Button :label="$t('parent.see_justifications')" size="small" outlined @click.stop="goTo('/parent/justifications', child.studentId)" />
              </div>
            </template>
          </Card>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import type { ParentChild } from '~/composables/useParent';

definePageMeta({ middleware: ['auth'] });

const { fetchChildren } = useParent();
const { fetchClassesByStudentId } = useClass();
const { setActiveChildId } = useParentChild();
const router = useRouter();

const children = ref<ParentChild[]>([]);
const classNames = ref<Record<string, string>>({});
const pending = ref(true);
const fetchError = ref<string | null>(null);

onMounted(async () => {
  try {
    children.value = await fetchChildren();
    await Promise.all(
      children.value.map(async (child) => {
        try {
          const classes = await fetchClassesByStudentId(child.studentId);
          if (classes[0]) classNames.value[child.studentId] = classes[0].name;
        } catch {
          // classe non résolue : pas bloquant pour l'affichage du tableau de bord
        }
      }),
    );
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
});

function selectChild(studentId: string) {
  setActiveChildId(studentId);
}

function goTo(path: string, studentId: string) {
  setActiveChildId(studentId);
  router.push(path);
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.children-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.child-card {
  cursor: pointer;
}

.child-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>

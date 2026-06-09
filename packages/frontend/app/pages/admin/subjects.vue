<template>
  <div class="page">
    <Card>
      <template #title>
        <div class="card-header">
          <span>Matières &amp; Programmes</span>
          <Button label="Nouvelle matière" icon="pi pi-plus" size="small" @click="openSubjectDialog(null)" />
        </div>
      </template>

      <template #content>
        <Message v-if="fetchError" severity="error" :closable="false">{{ fetchError }}</Message>

        <div v-else-if="pending" class="loading">
          <ProgressSpinner style="width: 2rem; height: 2rem" stroke-width="4" />
          <span>Chargement…</span>
        </div>

        <template v-else>
          <Accordion :value="openPanels" multiple class="subject-accordion">
            <AccordionPanel
              v-for="subject in subjects"
              :key="subject.id"
              :value="subject.id"
            >
              <AccordionHeader>
                <span class="subject-name">{{ subject.name }}</span>
                <span class="subject-count">
                  {{ coursesForSubject(subject.id).length }} programme(s)
                </span>
              </AccordionHeader>

              <AccordionContent>
                <div class="content-toolbar">
                  <div class="content-toolbar-actions">
                    <Button
                      label="Ajouter un programme"
                      icon="pi pi-plus"
                      size="small"
                      @click="openCourseDialog(null, subject.id)"
                    />
                    <Button
                      icon="pi pi-pencil"
                      severity="secondary"
                      text
                      rounded
                      size="small"
                      aria-label="Modifier la matière"
                      @click="openSubjectDialog(subject)"
                    />
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      rounded
                      size="small"
                      aria-label="Supprimer la matière"
                      :loading="deletingSubjectId === subject.id"
                      @click="removeSubject(subject.id)"
                    />
                  </div>
                </div>

                <p v-if="coursesForSubject(subject.id).length === 0" class="empty-courses">
                  Aucun programme dans cette matière.
                </p>
                <DataTable
                  v-else
                  :value="coursesForSubject(subject.id)"
                  data-key="id"
                  size="small"
                >
                  <Column field="name" header="Nom" />
                  <Column header="Sujets">
                    <template #body="{ data }">
                      <div v-if="data.topics.length > 0" class="tags">
                        <Tag
                          v-for="t in data.topics"
                          :key="t.id"
                          :value="t.name"
                          severity="secondary"
                        />
                      </div>
                      <span v-else class="muted">—</span>
                    </template>
                  </Column>
                  <Column header="Programmes liés">
                    <template #body="{ data }">
                      <div v-if="data.relatedCourses.length > 0" class="tags">
                        <Tag
                          v-for="r in data.relatedCourses"
                          :key="r.id"
                          :value="r.name"
                          severity="info"
                        />
                      </div>
                      <span v-else class="muted">—</span>
                    </template>
                  </Column>
                  <Column header="" style="width: 6rem">
                    <template #body="{ data }">
                      <div class="row-actions">
                        <Button
                          icon="pi pi-pencil"
                          severity="secondary"
                          text
                          rounded
                          size="small"
                          @click="openCourseDialog(data, subject.id)"
                        />
                        <Button
                          icon="pi pi-trash"
                          severity="danger"
                          text
                          rounded
                          size="small"
                          :loading="deletingCourseId === data.id"
                          @click="removeCourse(data.id)"
                        />
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </AccordionContent>
            </AccordionPanel>

            <!-- Programmes sans matière -->
            <AccordionPanel v-if="unassignedCourses.length > 0" value="__unassigned__">
              <AccordionHeader>
                <span class="subject-name muted">Sans matière</span>
                <span class="subject-count">{{ unassignedCourses.length }} programme(s)</span>
              </AccordionHeader>
              <AccordionContent>
                <div class="content-toolbar">
                  <div class="content-toolbar-actions">
                    <Button
                      label="Ajouter un programme"
                      icon="pi pi-plus"
                      size="small"
                      @click="openCourseDialog(null, null)"
                    />
                  </div>
                </div>
                <DataTable :value="unassignedCourses" data-key="id" size="small">
                  <Column field="name" header="Nom" />
                  <Column header="Sujets">
                    <template #body="{ data }">
                      <div v-if="data.topics.length > 0" class="tags">
                        <Tag
                          v-for="t in data.topics"
                          :key="t.id"
                          :value="t.name"
                          severity="secondary"
                        />
                      </div>
                      <span v-else class="muted">—</span>
                    </template>
                  </Column>
                  <Column header="Programmes liés">
                    <template #body="{ data }">
                      <div v-if="data.relatedCourses.length > 0" class="tags">
                        <Tag
                          v-for="r in data.relatedCourses"
                          :key="r.id"
                          :value="r.name"
                          severity="info"
                        />
                      </div>
                      <span v-else class="muted">—</span>
                    </template>
                  </Column>
                  <Column header="" style="width: 6rem">
                    <template #body="{ data }">
                      <div class="row-actions">
                        <Button
                          icon="pi pi-pencil"
                          severity="secondary"
                          text
                          rounded
                          size="small"
                          @click="openCourseDialog(data, null)"
                        />
                        <Button
                          icon="pi pi-trash"
                          severity="danger"
                          text
                          rounded
                          size="small"
                          :loading="deletingCourseId === data.id"
                          @click="removeCourse(data.id)"
                        />
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>

          <p v-if="subjects.length === 0 && unassignedCourses.length === 0" class="empty">
            Aucune matière créée. Commencez par ajouter une matière.
          </p>
        </template>
      </template>
    </Card>

    <AdminSubjectDialog
      v-model:visible="subjectDialogVisible"
      :subject="activeSubject"
      @saved="refresh"
    />

    <AdminCourseDialog
      v-model:visible="courseDialogVisible"
      :course="activeCourse"
      :subjects="subjects"
      :all-courses="courses"
      :default-subject-id="activeDefaultSubjectId"
      @saved="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import type { SubjectEntity } from '~/composables/useSubject';
import type { CourseEntity } from '~/composables/useCourse';

definePageMeta({ middleware: ['auth'] });

const { hasRole } = useAuth();
if (!hasRole('ADMIN')) {
  await navigateTo('/');
}

const { fetchSubjects, deleteSubject, normalizeApiError } = useSubject();
const { fetchCourses, deleteCourse } = useCourse();

const subjects = ref<SubjectEntity[]>([]);
const courses = ref<CourseEntity[]>([]);
const pending = ref(true);
const fetchError = ref<string | null>(null);
const deletingSubjectId = ref<string | null>(null);
const deletingCourseId = ref<string | null>(null);

const openPanels = ref<string[]>([]);

const coursesForSubject = (subjectId: string) =>
  courses.value.filter((c) => c.subjectId === subjectId);

const unassignedCourses = computed(() =>
  courses.value.filter((c) => !c.subjectId),
);

async function refresh() {
  pending.value = true;
  fetchError.value = null;
  try {
    [subjects.value, courses.value] = await Promise.all([fetchSubjects(), fetchCourses()]);
    openPanels.value = subjects.value.map((s) => s.id);
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    pending.value = false;
  }
}

await refresh();

async function removeSubject(id: string) {
  deletingSubjectId.value = id;
  try {
    await deleteSubject(id);
    await refresh();
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    deletingSubjectId.value = null;
  }
}

async function removeCourse(id: string) {
  deletingCourseId.value = id;
  try {
    await deleteCourse(id);
    await refresh();
  } catch (e) {
    fetchError.value = normalizeApiError(e);
  } finally {
    deletingCourseId.value = null;
  }
}

const subjectDialogVisible = ref(false);
const activeSubject = ref<SubjectEntity | null>(null);

function openSubjectDialog(subject: SubjectEntity | null) {
  activeSubject.value = subject;
  subjectDialogVisible.value = true;
}

const courseDialogVisible = ref(false);
const activeCourse = ref<CourseEntity | null>(null);
const activeDefaultSubjectId = ref<string | null>(null);

function openCourseDialog(course: CourseEntity | null, subjectId: string | null) {
  activeCourse.value = course;
  activeDefaultSubjectId.value = subjectId;
  courseDialogVisible.value = true;
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 6rem;
  color: var(--p-text-muted-color, #64748b);
}

.empty {
  color: var(--p-text-muted-color, #64748b);
  padding: 1rem 0;
}

.subject-accordion {
  border: none;
}

.subject-name {
  font-weight: 600;
  margin-right: 0.75rem;
}

.subject-count {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--p-text-muted-color, #64748b);
}

.content-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

.content-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.empty-courses {
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.875rem;
  margin: 0 0 0.5rem;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.muted {
  color: var(--p-text-muted-color, #64748b);
}

.row-actions {
  display: flex;
  gap: 0.25rem;
}
</style>

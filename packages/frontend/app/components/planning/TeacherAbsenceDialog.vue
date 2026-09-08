<template>
  <Dialog
    v-model:visible="visible"
    :header="$t('planning.absences.teacher_dialog.title')"
    modal
    :style="{ width: '34rem' }"
    @hide="reinitialiser"
  >
    <div class="form">
      <p class="intro">{{ $t('planning.absences.teacher_dialog.intro') }}</p>

      <div class="field">
        <label for="abs-prof">{{ $t('planning.absences.teacher_dialog.teacher') }}</label>
        <Select
          id="abs-prof"
          v-model="enseignantId"
          :options="optionsEnseignants"
          option-label="label"
          option-value="value"
          :placeholder="$t('planning.absences.teacher_dialog.choose_teacher')"
          filter
          fluid
        />
      </div>

      <div class="field">
        <label for="abs-jour">{{ $t('planning.absences.teacher_dialog.day') }}</label>
        <DatePicker
          id="abs-jour"
          v-model="jour"
          date-format="dd/mm/yy"
          :manual-input="false"
          show-icon
          fluid
        />
      </div>

      <Message v-if="erreur" severity="error" :closable="false">{{ erreur }}</Message>

      <div v-if="chargement" class="loading">
        <ProgressSpinner style="width: 1.5rem; height: 1.5rem" stroke-width="4" />
        <span>{{ $t('common.loading') }}</span>
      </div>

      <template v-else-if="enseignantId && jour">
        <p v-if="seances.length === 0" class="vide">
          {{ $t('planning.absences.teacher_dialog.no_session') }}
        </p>

        <div v-else class="seances">
          <p class="compte">
            {{ $t('planning.absences.teacher_dialog.session_count', { count: seances.length }) }}
          </p>
          <div v-for="s in seances" :key="s.id" class="seance">
            <Checkbox v-model="selection" :input-id="`s-${s.id}`" :value="s.id" />
            <label :for="`s-${s.id}`">
              <strong>{{ heure(s.startAt) }}</strong>
              {{ libelle(s) }}
              <span v-if="dejaAbsent.has(s.id)" class="deja">
                {{ $t('planning.absences.teacher_dialog.already') }}
              </span>
            </label>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="$t('planning.absences.teacher_dialog.submit', { count: selection.length })"
        :loading="envoi"
        :disabled="selection.length === 0"
        @click="soumettre"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { normalizeApiError } from '~/composables/useClass';
import { userOptionLabel, type UserProfile } from '~/composables/useUser';
import type { Session } from '~/composables/usePlanning';

/**
 * Déclaration d'absence d'un enseignant.
 *
 * L'onglet « Professeurs » affichait une table alimentée par
 * `GET /planning/absences?role=TEACHER`, mais rien ne permettait d'y créer quoi
 * que ce soit : le modèle prévoyait `AbsenceRole.TEACHER`, l'API l'acceptait,
 * et l'onglet restait vide en permanence faute d'écriture.
 *
 * Le dialogue raisonne par journée et non par séance : un enseignant absent
 * manque tous ses cours du jour, et les cocher un par un depuis l'appel de
 * chaque classe serait absurde. Ses séances du jour sont donc listées et
 * présélectionnées, à charge de décocher ce qui reste assuré.
 */
const emit = defineEmits<{ (e: 'saved'): void }>();

const visible = defineModel<boolean>('visible', { default: false });

const { fetchAllUsers } = useUser();
const { fetchSessions, fetchAbsences, createAbsence } = usePlanning();
const { fetchClasses, fetchAssignableCourses } = useClass();

const enseignants = ref<UserProfile[]>([]);
// Une séance ne porte que des identifiants : sans ces deux tables, la ligne se
// résumerait à une heure et une salle, et choisir « le cours de 10h » reviendrait
// à cocher à l'aveugle.
const nomsClasses = ref<Map<string, string>>(new Map());
const nomsCours = ref<Map<string, string>>(new Map());
const seances = ref<Session[]>([]);
const dejaAbsent = ref<Set<string>>(new Set());
const enseignantId = ref<string | null>(null);
const jour = ref<Date | null>(new Date());
const selection = ref<string[]>([]);
const chargement = ref(false);
const envoi = ref(false);
const erreur = ref<string | null>(null);

const optionsEnseignants = computed(() =>
  enseignants.value.map((u) => ({ label: userOptionLabel(u), value: u.id })),
);

watch(visible, async (ouvert) => {
  if (!ouvert || enseignants.value.length > 0) return;
  const [profs, classes, cours] = await Promise.all([
    fetchAllUsers().catch(() => []),
    fetchClasses().catch(() => []),
    fetchAssignableCourses().catch(() => []),
  ]);
  enseignants.value = profs.filter((u) => u.role === 'TEACHER');
  nomsClasses.value = new Map(classes.map((c) => [c.id, c.name]));
  nomsCours.value = new Map(cours.map((c) => [c.id, c.name]));
});

/** « CM2-A · Mathématiques — B201 », en dégradant sur ce qui est connu. */
function libelle(s: Session) {
  const classe = nomsClasses.value.get(s.classId);
  const cours = nomsCours.value.get(s.courseId);
  const matiere = [classe, cours].filter(Boolean).join(' · ');
  return [matiere || null, s.room].filter(Boolean).join(' — ') || '—';
}

/** Bornes UTC de la journée choisie, pour interroger les séances. */
function bornes(d: Date) {
  const debut = new Date(d);
  debut.setHours(0, 0, 0, 0);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 1);
  return { from: debut.toISOString(), to: fin.toISOString() };
}

async function chargerSeances() {
  selection.value = [];
  seances.value = [];
  dejaAbsent.value = new Set();
  if (!enseignantId.value || !jour.value) return;

  chargement.value = true;
  erreur.value = null;
  try {
    const { from, to } = bornes(jour.value);
    const liste = await fetchSessions({ teacherId: enseignantId.value, from, to });
    seances.value = [...liste].sort((a, b) => a.startAt.localeCompare(b.startAt));

    // Une absence déjà déclarée ne doit pas être proposée une seconde fois : le
    // backend la refuserait, et l'échec ne dirait pas laquelle des séances pose
    // problème.
    const existantes = await fetchAbsences({ role: 'TEACHER', userId: enseignantId.value });
    dejaAbsent.value = new Set(existantes.map((a) => a.sessionId));

    selection.value = seances.value.filter((s) => !dejaAbsent.value.has(s.id)).map((s) => s.id);
  } catch (e) {
    erreur.value = normalizeApiError(e);
  } finally {
    chargement.value = false;
  }
}

watch([enseignantId, jour], chargerSeances);

function heure(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function reinitialiser() {
  enseignantId.value = null;
  jour.value = new Date();
  seances.value = [];
  selection.value = [];
  erreur.value = null;
}

async function soumettre() {
  if (!enseignantId.value || selection.value.length === 0) return;
  envoi.value = true;
  erreur.value = null;
  try {
    // En série plutôt qu'en parallèle : l'API crée une absence par séance, et un
    // échec partiel doit laisser les précédentes en place plutôt que d'échouer
    // en bloc de façon indéterminée.
    for (const sessionId of selection.value) {
      await createAbsence({ sessionId, userId: enseignantId.value, role: 'TEACHER' });
    }
    emit('saved');
    visible.value = false;
  } catch (e) {
    erreur.value = normalizeApiError(e);
  } finally {
    envoi.value = false;
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.intro {
  margin: 0;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
  font-size: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.loading,
.vide {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.seances {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.compte {
  margin: 0;
  font-weight: 600;
}

.seance {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.deja {
  margin-left: 0.5rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}
</style>

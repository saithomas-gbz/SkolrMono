<template>
  <Dialog
    v-model:visible="visible"
    :header="$t('admin.create_dialog.title')"
    modal
    :style="{ width: '32rem' }"
    @hide="reinitialiser"
  >
    <div class="form">
      <p class="intro">{{ $t('admin.create_dialog.intro') }}</p>

      <div class="field">
        <label for="creer-email">{{ $t('admin.create_dialog.email') }}</label>
        <InputText id="creer-email" v-model="form.email" type="email" fluid variant="outlined" />
      </div>

      <div class="field">
        <label for="creer-nom">{{ $t('admin.create_dialog.name') }}</label>
        <InputText id="creer-nom" v-model="form.name" fluid variant="outlined" />
        <small class="hint">{{ $t('admin.create_dialog.name_hint') }}</small>
      </div>

      <div class="field">
        <label for="creer-role">{{ $t('admin.create_dialog.role') }}</label>
        <Select
          id="creer-role"
          v-model="form.role"
          :options="optionsRole"
          option-label="label"
          option-value="value"
          :placeholder="$t('admin.create_dialog.choose_role')"
          fluid
        />
      </div>

      <div v-if="rattachementPossible" class="field">
        <label for="creer-classe">{{ $t('admin.create_dialog.class') }}</label>
        <Select
          id="creer-classe"
          v-model="form.classId"
          :options="classes"
          option-label="name"
          option-value="id"
          :placeholder="$t('admin.create_dialog.class_none')"
          show-clear
          fluid
        />
        <small class="hint">{{ indiceClasse }}</small>
      </div>

      <div v-if="form.role === 'TEACHER' && form.classId" class="field">
        <label for="creer-cours">{{ $t('admin.create_dialog.courses') }}</label>
        <MultiSelect
          id="creer-cours"
          v-model="form.courseIds"
          :options="cours"
          option-label="name"
          option-value="id"
          display="chip"
          fluid
        />
        <small class="hint">{{ $t('admin.create_dialog.courses_hint') }}</small>
      </div>

      <div class="field">
        <label for="creer-mdp">{{ $t('admin.create_dialog.password') }}</label>
        <div class="ligne-mdp">
          <InputText id="creer-mdp" v-model="form.password" fluid variant="outlined" />
          <Button
            :label="$t('admin.create_dialog.generate')"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            @click="genererMotDePasse"
          />
        </div>
        <small v-if="motDePasseTropCourt" class="hint erreur">
          {{ $t('admin.create_dialog.password_too_short', { min: AUTH_PASSWORD_MIN_LENGTH }) }}
        </small>
      </div>

      <Message v-if="erreur" severity="error" :closable="false">{{ erreur }}</Message>
    </div>

    <template #footer>
      <Button :label="$t('common.cancel')" severity="secondary" text @click="visible = false" />
      <Button
        :label="$t('admin.create_dialog.submit')"
        :loading="envoi"
        :disabled="!formulaireValide"
        @click="soumettre"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { AUTH_PASSWORD_MIN_LENGTH } from '~/composables/useAuth';
import type { InvitableRole } from '~/composables/useInvitation';

/**
 * Création directe d'un compte par un administrateur.
 *
 * Complète l'invitation par email plutôt que la remplacer : le compte est actif
 * immédiatement, ce qui évite de dépendre d'un email lors d'une inscription au
 * guichet ou d'une démonstration. Le mot de passe saisi ici est provisoire —
 * le backend pose `mustChangePassword`, et la personne devra le remplacer à sa
 * première connexion.
 */
const emit = defineEmits<{ (e: 'created', email: string): void }>();

const { t } = useI18n();
const visible = defineModel<boolean>('visible', { default: false });
const { createUser, normalizeApiError } = useUser();
const { fetchClasses, fetchAssignableCourses, enrollStudent, assignTeacher, setTeacherCourses } =
  useClass();

const classes = ref<Array<{ id: string; name: string }>>([]);
const cours = ref<Array<{ id: string; name: string }>>([]);

// Seuls ces deux rôles ont une place dans une classe : la vie scolaire et les
// parents n'y sont pas rattachés.
const formulaireVierge = (): {
  email: string;
  name: string;
  role: InvitableRole | null;
  password: string;
  classId: string | null;
  courseIds: string[];
} => ({ email: '', name: '', role: null, password: '', classId: null, courseIds: [] });

const form = reactive(formulaireVierge());

const rattachementPossible = computed(
  () => form.role === 'USER' || form.role === 'TEACHER',
);

const indiceClasse = computed(() =>
  form.role === 'TEACHER'
    ? t('admin.create_dialog.class_hint_teacher')
    : t('admin.create_dialog.class_hint_student'),
);

// Charge les listes à la première ouverture seulement : elles ne changent pas
// pendant la saisie, et l'admin ouvre souvent le dialogue plusieurs fois.
watch(visible, async (ouvert) => {
  if (!ouvert || classes.value.length > 0) return;
  const [c, co] = await Promise.all([
    fetchClasses().catch(() => []),
    fetchAssignableCourses().catch(() => []),
  ]);
  classes.value = c;
  cours.value = co;
});

// Changer de rôle peut rendre le rattachement caché : ne pas laisser une valeur
// invisible être envoyée.
watch(
  () => form.role,
  () => {
    if (!rattachementPossible.value) {
      form.classId = null;
    }
    if (form.role !== 'TEACHER') {
      form.courseIds = [];
    }
  },
);

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const envoi = ref(false);
const erreur = ref<string | null>(null);

const optionsRole = computed(() => [
  { label: t('admin.invite_dialog.role_user'), value: 'USER' as InvitableRole },
  { label: t('admin.invite_dialog.role_teacher'), value: 'TEACHER' as InvitableRole },
  { label: t('admin.invite_dialog.role_staff'), value: 'STAFF' as InvitableRole },
  { label: t('admin.invite_dialog.role_parent'), value: 'PARENT' as InvitableRole },
]);

const motDePasseTropCourt = computed(
  () => form.password.length > 0 && form.password.length < AUTH_PASSWORD_MIN_LENGTH,
);

const formulaireValide = computed(
  () =>
    FORMAT_EMAIL.test(form.email.trim()) &&
    !!form.role &&
    form.password.length >= AUTH_PASSWORD_MIN_LENGTH,
);

/**
 * Mot de passe provisoire lisible à l'oral : pas de caractères ambigus (I, l, 1,
 * O, 0), puisqu'il sera dicté ou recopié avant d'être remplacé.
 */
function genererMotDePasse() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const valeurs = new Uint32Array(12);
  crypto.getRandomValues(valeurs);
  form.password = Array.from(valeurs, (v) => alphabet[v % alphabet.length]).join('');
}

function reinitialiser() {
  Object.assign(form, formulaireVierge());
  erreur.value = null;
}

async function soumettre() {
  if (!form.role) return;
  erreur.value = null;
  envoi.value = true;
  try {
    const email = form.email.trim();
    const cree = await createUser({
      email,
      password: form.password,
      name: form.name.trim() || undefined,
      role: form.role,
    });

    // Le rattachement suit la création, en deux appels distincts : le compte
    // existe déjà si celui-ci échoue. On le signale sans prétendre que rien
    // n'a été fait — l'administrateur doit savoir que le compte est créé.
    if (form.classId && rattachementPossible.value) {
      try {
        if (form.role === 'TEACHER') {
          await assignTeacher(form.classId, cree.id);
          if (form.courseIds.length > 0) {
            await setTeacherCourses(form.classId, cree.id, form.courseIds);
          }
        } else {
          await enrollStudent(form.classId, cree.id);
        }
      } catch {
        erreur.value = t('admin.create_dialog.linked_error');
        emit('created', email);
        return;
      }
    }

    emit('created', email);
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

.ligne-mdp {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.hint {
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.erreur {
  color: var(--p-red-500, #d33);
}
</style>

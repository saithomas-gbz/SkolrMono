<template>
  <div class="page">
    <Card class="carte">
      <template #title>{{ $t('auth.change_password.title') }}</template>
      <template #content>
        <p class="intro">{{ $t('auth.change_password.intro') }}</p>

        <Message v-if="erreur" severity="error" :closable="false">{{ erreur }}</Message>

        <form class="formulaire" @submit.prevent="soumettre">
          <div class="champ">
            <label for="cp-actuel">{{ $t('auth.change_password.current') }}</label>
            <Password
              id="cp-actuel"
              v-model="actuel"
              :feedback="false"
              toggle-mask
              fluid
              autocomplete="current-password"
            />
          </div>

          <div class="champ">
            <label for="cp-nouveau">{{ $t('auth.change_password.new') }}</label>
            <Password
              id="cp-nouveau"
              v-model="nouveau"
              toggle-mask
              fluid
              autocomplete="new-password"
            />
          </div>

          <div class="champ">
            <label for="cp-confirmation">{{ $t('auth.change_password.confirm') }}</label>
            <Password
              id="cp-confirmation"
              v-model="confirmation"
              :feedback="false"
              toggle-mask
              fluid
              autocomplete="new-password"
            />
          </div>

          <Button
            type="submit"
            :label="$t('auth.change_password.submit')"
            :loading="envoi"
            :disabled="!formulaireValide"
          />
        </form>

        <Button
          class="deconnexion"
          :label="$t('auth.change_password.logout')"
          severity="secondary"
          text
          size="small"
          @click="seDeconnecter"
        />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { AUTH_PASSWORD_MIN_LENGTH, normalizeAuthError } from '~/composables/useAuth';
import { writeAuthUser } from '~/composables/authSession';

/**
 * Changement imposé d'un mot de passe provisoire.
 *
 * Pas de middleware `auth` ici : `password.global.ts` cantonne déjà toute
 * session concernée sur cette page, et y ajouter `auth` ferait double emploi.
 * La page reste inatteignable sans session puisqu'elle exige le mot de passe
 * actuel pour aboutir.
 */
const { t } = useI18n();
const { logout, user } = useAuth();
const { changePassword } = useUser();
const toast = useToast();
const router = useRouter();

const actuel = ref('');
const nouveau = ref('');
const confirmation = ref('');
const envoi = ref(false);
const erreur = ref<string | null>(null);

const formulaireValide = computed(
  () =>
    actuel.value.length > 0 &&
    nouveau.value.length >= AUTH_PASSWORD_MIN_LENGTH &&
    nouveau.value === confirmation.value &&
    nouveau.value !== actuel.value,
);

async function soumettre() {
  erreur.value = null;

  if (nouveau.value !== confirmation.value) {
    erreur.value = t('auth.change_password.mismatch');
    return;
  }
  if (nouveau.value.length < AUTH_PASSWORD_MIN_LENGTH) {
    erreur.value = t('auth.change_password.too_short', { min: AUTH_PASSWORD_MIN_LENGTH });
    return;
  }
  if (nouveau.value === actuel.value) {
    erreur.value = t('auth.change_password.same_as_current');
    return;
  }

  envoi.value = true;
  try {
    await changePassword(actuel.value, nouveau.value);

    // Le drapeau est levé localement plutôt qu'en réclamant un nouveau jeton.
    //
    // Un `refreshSession()` ici semblait plus propre — relire l'état en base
    // plutôt que le déduire — mais le jeton de rafraîchissement est à usage
    // unique avec rotation : cet appel entrait en concurrence avec celui que
    // `useApi` déclenche sur la navigation suivante, le rejeu était interprété
    // comme un vol de jeton, et la session entière se trouvait révoquée. Une
    // cascade de 401 renvoyait alors l'utilisateur sur `/auth/login?expired=1`
    // juste après avoir choisi son mot de passe.
    //
    // Le serveur vient de confirmer le changement : la contrainte est levée. Le
    // jeton d'accès porte encore l'ancien drapeau, sans conséquence puisque seul
    // le middleware le lit, et le prochain rafraîchissement naturel apportera
    // des claims à jour.
    if (user.value) {
      writeAuthUser({ ...user.value, mustChangePassword: false });
    }

    toast.add({
      severity: 'success',
      summary: t('auth.change_password.success'),
      life: 5000,
    });

    return router.push('/dashboard');
  } catch (e) {
    erreur.value = normalizeAuthError(e);
  } finally {
    envoi.value = false;
  }
}

async function seDeconnecter() {
  await logout();
  return router.push('/auth/login');
}
</script>

<style scoped>
.page {
  display: grid;
  place-items: start center;
  padding: 1rem;
}

.carte {
  width: min(28rem, 100%);
}

.intro {
  margin: 0 0 1.25rem;
  color: var(--p-text-muted-color, var(--skolr-color-text-muted));
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.champ {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.deconnexion {
  margin-top: 1rem;
}
</style>

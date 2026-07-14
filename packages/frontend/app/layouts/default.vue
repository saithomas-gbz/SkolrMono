<template>
  <AppShell
    v-if="isLoggedIn"
    :links="navLinks"
    :admin-links="adminLinks"
    :bottom-link="profileLink"
  >
    <template #banner>
      <Message
        v-if="showInactiveSubscriptionBanner"
        severity="warn"
        :closable="false"
        class="subscription-banner"
      >
        {{ $t('billing.inactive_warning') }}
        <NuxtLink to="/admin/billing" class="banner-link">{{ $t('billing.manage_billing') }}</NuxtLink>
      </Message>
    </template>

    <slot />
  </AppShell>
  <div v-else class="guest-root">
    <slot />
  </div>
  <!-- Hors du `v-if` : le toast doit rester monté même en état invité (page login),
       où l'interceptor de session signale une expiration (#137). -->
  <Toast position="bottom-right" />
</template>

<script setup lang="ts">
import AppShell from '~/components/shell/AppShell.vue';
import type { ShellNavLink } from '~/components/shell/NavRail.vue';

const { t } = useI18n();
const { isLoggedIn, hasRole } = useAuth();

const isTeacher = computed(() => hasRole('TEACHER', 'STAFF'));
const isAdmin = computed(() => hasRole('ADMIN'));
const isStudent = computed(() => hasRole('USER'));
const isParent = computed(() => hasRole('PARENT'));

const navLinks = computed<ShellNavLink[]>(() => {
  const links: ShellNavLink[] = [
    { label: t('nav.home'), to: '/', icon: 'pi-home' },
    { label: t('nav.dashboard'), to: '/dashboard', icon: 'pi-th-large' },
  ];

  if (isTeacher.value) {
    links.push({ label: t('nav.my_students'), to: '/teacher/students', icon: 'pi-users' });
  }

  if (isAdmin.value) {
    links.push({ label: t('nav.school_students'), to: '/admin/students', icon: 'pi-users' });
  }

  links.push({ label: t('nav.messages'), to: '/messages', icon: 'pi-envelope' });
  links.push({ label: t('nav.schedule'), to: '/planning', icon: 'pi-calendar' });

  if (isTeacher.value || isAdmin.value) {
    links.push({ label: t('nav.absences'), to: '/planning/absences', icon: 'pi-table' });
    links.push({ label: t('nav.statistics'), to: '/statistics', icon: 'pi-chart-bar' });
  }

  if (isStudent.value) {
    links.push({ label: t('nav.my_absences'), to: '/planning/my-absences', icon: 'pi-table' });
    links.push({ label: t('nav.my_grades'), to: '/grades/my-grades', icon: 'pi-book' });
    links.push({ label: t('homework.title'), to: '/homework', icon: 'pi-check-square' });
  }

  if (isTeacher.value) {
    links.push({ label: t('nav.gradebook'), to: '/grades/assignments/new', icon: 'pi-book' });
  }

  if (isParent.value) {
    links.push({ label: t('nav.family_space'), to: '/parent', icon: 'pi-home' });
  }

  return links;
});

const adminLinks = computed<ShellNavLink[]>(() =>
  isAdmin.value
    ? [
        { label: t('nav.users'), to: '/admin/users', icon: 'pi-users' },
        { label: t('nav.subjects'), to: '/admin/subjects', icon: 'pi-book' },
        { label: t('nav.billing'), to: '/admin/billing', icon: 'pi-wallet' },
        { label: t('nav.parent_links'), to: '/admin/parent-links', icon: 'pi-sitemap' },
      ]
    : [],
);

// Pinned at the bottom of the rail, matching the sketch's "Settings" slot —
// this app has no dedicated settings page, so it points at the profile page.
const profileLink = computed<ShellNavLink>(() => ({
  label: t('nav.profile'),
  to: '/profile',
  icon: 'pi-user',
}));

const subscriptionStatus = ref<string | null>(null);

if (isAdmin.value) {
  const { fetchEstablishment } = useBilling();
  fetchEstablishment()
    .then((establishment) => {
      subscriptionStatus.value = establishment.subscription?.status ?? null;
    })
    .catch(() => {
      // Établissement non trouvé ou erreur réseau : pas de bannière, la page /admin/billing
      // affiche déjà le détail de l'erreur si besoin.
    });
}

const showInactiveSubscriptionBanner = computed(
  () =>
    isAdmin.value &&
    subscriptionStatus.value !== null &&
    subscriptionStatus.value !== 'ACTIVE' &&
    subscriptionStatus.value !== 'TRIALING',
);
</script>

<style scoped>
.subscription-banner {
  margin: var(--skolr-space-4) var(--skolr-space-6) 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.banner-link {
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
}

.guest-root {
  min-height: 100dvh;
}
</style>

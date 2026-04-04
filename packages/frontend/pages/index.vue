<script setup lang="ts">
import { navigateTo } from '#imports';
import { useAuth } from '@/composables/useAuth';

const { loggedIn, user, logout } = useAuth();

const goLogin = () => {
  void navigateTo('/login');
};

const goRegister = () => {
  void navigateTo('/register');
};
</script>

<template>
  <div class="min-h-screen surface-ground flex justify-content-center p-4">
    <div class="w-full lg:w-4">
      <h1 class="text-900 text-4xl font-medium mb-2">Skolr</h1>
      <p class="text-600 mb-4">School management platform</p>

      <div v-if="loggedIn" class="surface-card p-4 border-round shadow-1 mb-4">
        <p class="text-900 font-medium mb-2">Signed in</p>
        <p v-if="user" class="text-600 text-sm mb-3">
          {{ (user as { email?: string }).email ?? 'User' }}
        </p>
        <Button label="Sign out" severity="secondary" class="w-full" @click="logout" />
      </div>

      <nav v-else class="flex flex-column gap-2">
        <Button label="Sign in" class="w-full" @click="goLogin" />
        <Button
          label="Create account"
          severity="secondary"
          outlined
          class="w-full"
          @click="goRegister"
        />
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#imports';
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';

const { login, loginWithGoogle } = useAuth();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await login(email.value, password.value);
    if (result.success) {
      await navigateTo('/');
    } else {
      error.value = 'Invalid credentials';
    }
  } catch {
    error.value = 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
};

const handleGoogleLogin = () => {
  loginWithGoogle();
};
</script>

<template>
  <SkolrAuthShell>
    <SkolrAuthPageHeader>
      <template #title>Welcome Back</template>
      <template #hint>Don't have an account?</template>
      <template #action>
        <NuxtLink
          to="/register"
          class="font-medium no-underline ml-2 text-blue-500 cursor-pointer"
        >
          Create today!
        </NuxtLink>
      </template>
    </SkolrAuthPageHeader>

    <div>
      <SkolrTextField
        v-model="email"
        input-id="email"
        label="Email"
        placeholder="Email address"
      />
      <SkolrPasswordField
        v-model="password"
        input-id="password"
        label="Password"
        placeholder="Password"
      />

      <div v-if="error" class="p-error text-sm mb-3">{{ error }}</div>

      <Button
        label="Sign In"
        icon="pi pi-user"
        class="w-full mb-3"
        :loading="loading"
        @click="handleLogin"
      />

      <SkolrAuthOrDivider>or</SkolrAuthOrDivider>

      <Button
        label="Sign in with Google"
        icon="pi pi-google"
        class="w-full p-button-outlined"
        @click="handleGoogleLogin"
      />
    </div>
  </SkolrAuthShell>
</template>

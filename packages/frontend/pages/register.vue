<script setup lang="ts">
import { navigateTo } from '#imports';
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';

const { register } = useAuth();

const email = ref('');
const password = ref('');
const name = ref('');
const error = ref('');
const success = ref(false);
const loading = ref(false);

const handleRegister = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please fill in all required fields';
    return;
  }

  loading.value = true;
  error.value = '';
  success.value = false;

  try {
    const result = await register(email.value, password.value, name.value);
    if (result.success) {
      success.value = true;
      setTimeout(async () => {
        await navigateTo('/login');
      }, 2000);
    } else {
      error.value = 'Registration failed';
    }
  } catch {
    error.value = 'Registration failed. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <SkolrAuthShell>
    <SkolrAuthPageHeader>
      <template #title>Create Account</template>
      <template #hint>Already have an account?</template>
      <template #action>
        <NuxtLink
          to="/login"
          class="font-medium no-underline ml-2 text-blue-500 cursor-pointer"
        >
          Sign in here!
        </NuxtLink>
      </template>
    </SkolrAuthPageHeader>

    <div v-if="success" class="mb-4 p-3 surface-ground border-round">
      <div class="flex align-items-center">
        <i class="pi pi-check-circle text-green-500 mr-2" />
        <span class="text-green-500">Registration successful! Redirecting to login...</span>
      </div>
    </div>

    <div v-if="!success">
      <SkolrTextField
        v-model="name"
        input-id="name"
        label="Full Name"
        placeholder="Your full name"
      />
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
        label="Register"
        icon="pi pi-user-plus"
        class="w-full mb-3"
        :loading="loading"
        @click="handleRegister"
      />
    </div>
  </SkolrAuthShell>
</template>

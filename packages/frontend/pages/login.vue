<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { login, loginWithGoogle } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await login(email.value, password.value)
    if (result.success) {
      await navigateTo('/')
    } else {
      error.value = 'Invalid credentials'
    }
  } catch (err) {
    error.value = 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = () => {
  loginWithGoogle()
}
</script>

<template>
  <div class="flex justify-content-center align-items-center min-h-screen">
    <div class="surface-card p-4 shadow-2 border-round w-full lg:w-4">
      <div class="text-center mb-5">
        <div class="text-900 text-3xl font-medium mb-3">Welcome Back</div>
        <span class="text-600 font-medium line-height-3">Don't have an account?</span>
        <NuxtLink to="/register" class="font-medium no-underline ml-2 text-blue-500 cursor-pointer">
          Create today!
        </NuxtLink>
      </div>

      <div>
        <label for="email" class="block text-900 font-medium mb-2">Email</label>
        <InputText 
          id="email" 
          v-model="email" 
          type="text" 
          class="w-full mb-3" 
          placeholder="Email address"
        />

        <label for="password" class="block text-900 font-medium mb-2">Password</label>
        <Password 
          id="password" 
          v-model="password" 
          class="w-full mb-3" 
          placeholder="Password"
          toggleMask
        />

        <div v-if="error" class="p-error text-sm mb-3">{{ error }}</div>

        <Button 
          label="Sign In" 
          icon="pi pi-user" 
          class="w-full mb-3" 
          @click="handleLogin"
          :loading="loading"
        />

        <div class="flex align-items-center justify-content-center mb-4">
          <div class="flex-grow-1" style="height: 1px; background: var(--surface-border)"></div>
          <div class="px-3 text-600">or</div>
          <div class="flex-grow-1" style="height: 1px; background: var(--surface-border)"></div>
        </div>

        <Button 
          label="Sign in with Google" 
          icon="pi pi-google" 
          class="w-full p-button-outlined" 
          @click="handleGoogleLogin"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pi-eye {
  transform: scale(1.6);
  margin-right: 1rem;
}

.pi-eye-slash {
  transform: scale(1.6);
  margin-right: 1rem;
}
</style>
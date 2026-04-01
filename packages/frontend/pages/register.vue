<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { register } = useAuth()

const email = ref('')
const password = ref('')
const name = ref('')
const error = ref('')
const success = ref(false)
const loading = ref(false)

const handleRegister = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please fill in all required fields'
    return
  }

  loading.value = true
  error.value = ''
  success.value = false

  try {
    const result = await register(email.value, password.value, name.value)
    if (result.success) {
      success.value = true
      setTimeout(async () => {
        await navigateTo('/login')
      }, 2000)
    } else {
      error.value = 'Registration failed'
    }
  } catch (err) {
    error.value = 'Registration failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex justify-content-center align-items-center min-h-screen">
    <div class="surface-card p-4 shadow-2 border-round w-full lg:w-4">
      <div class="text-center mb-5">
        <div class="text-900 text-3xl font-medium mb-3">Create Account</div>
        <span class="text-600 font-medium line-height-3">Already have an account?</span>
        <NuxtLink to="/login" class="font-medium no-underline ml-2 text-blue-500 cursor-pointer">
          Sign in here!
        </NuxtLink>
      </div>

      <div v-if="success" class="mb-4 p-3 surface-ground border-round">
        <div class="flex align-items-center">
          <i class="pi pi-check-circle text-green-500 mr-2"></i>
          <span class="text-green-500">Registration successful! Redirecting to login...</span>
        </div>
      </div>

      <div v-if="!success">
        <label for="name" class="block text-900 font-medium mb-2">Full Name</label>
        <InputText 
          id="name" 
          v-model="name" 
          type="text" 
          class="w-full mb-3" 
          placeholder="Your full name"
        />

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
          label="Register" 
          icon="pi pi-user-plus" 
          class="w-full mb-3" 
          @click="handleRegister"
          :loading="loading"
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
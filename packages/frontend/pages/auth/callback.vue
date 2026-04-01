<script setup>
const route = useRoute()
const auth = useAuth()

onMounted(async () => {
  if (route.query.token) {
    await auth.setToken(route.query.token as string)
    await navigateTo('/')
  }
})
</script>

<template>
  <div>Loading...</div>
</template>
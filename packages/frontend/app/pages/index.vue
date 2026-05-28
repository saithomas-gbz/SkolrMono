<script setup lang="ts">
const { isLoggedIn } = useAuth();
await navigateTo(isLoggedIn.value ? '/dashboard' : '/auth/login');
</script>

import { defineNuxtPlugin, useAuth } from '#imports';

export default defineNuxtPlugin(() => {
  const auth = useAuth();

  // Configuration pour nuxt-auth-utils
  auth.setStrategy('local', {
    endpoints: {
      login: { url: 'http://localhost:3000/login', method: 'post' },
      register: { url: 'http://localhost:3000/register', method: 'post' },
      user: { url: 'http://localhost:3000/user', method: 'get' }
    },
    token: {
      property: 'token',
      type: 'Bearer',
      name: 'Authorization'
    },
    user: {
      property: 'user'
    }
  });

  // Configuration pour Google OAuth
  auth.setStrategy('google', {
    endpoints: {
      login: { url: 'http://localhost:3000/login/google' },
      callback: { url: 'http://localhost:3000/login/google/callback' },
      user: { url: 'http://localhost:3000/user', method: 'get' }
    },
    token: {
      property: 'token',
      type: 'Bearer',
      name: 'Authorization'
    },
    user: {
      property: 'user'
    }
  });
});

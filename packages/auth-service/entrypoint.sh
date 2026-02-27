#!/bin/sh

# Attendre que la base de données soit prête
echo "Attente de la base de données..."
while ! nc -z postgres 5432; do
  sleep 1
done

echo "Base de données prête"

# Exécuter les migrations Prisma
npx prisma migrate dev

# Démarrer l'application
echo "Démarrage de l'application..."
npx ts-node --project ./tsconfig.json src/app.ts
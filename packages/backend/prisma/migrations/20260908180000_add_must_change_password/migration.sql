-- Compte cree par un administrateur avec un mot de passe provisoire.
-- Tant que le drapeau est vrai, la session est cantonnee a l'ecran de
-- changement de mot de passe.
ALTER TABLE "auth"."User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

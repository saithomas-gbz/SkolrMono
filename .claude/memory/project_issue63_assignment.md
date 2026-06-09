---
name: project-issue63-assignment
description: Issue #63 - Carnet de notes : entité Assignment implémentée dans grade-service et frontend
metadata:
  type: project
---

Issue #63 complété (2026-06-09). Implémentation du carnet de notes avec devoirs.

**Why:** Les profs ne pouvaient pas associer une note à un devoir, ni saisir les notes de toute une classe en une fois.

**Backend (grade-service) :**
- Schéma Prisma mis à jour : enum `AssignmentStatus`, enum `GradeStatus`, modèle `Assignment`, refonte `Grade` (ajout `assignmentId`, `status`, `comment`, `value` nullable)
- Migration SQL avec data migration des notes legacy → devoir "Notes importées"
- `assignmentController.ts` : CRUD + publish + grade-grid + batch grades + gradebook
- `assignmentRoutes.ts`, `assignmentOpenApi.ts`
- `gradeController.ts` / `gradeOpenApi.ts` mis à jour pour les nouveaux champs
- Seed mis à jour avec 6 devoirs (DRAFT/PUBLISHED/CLOSED) et notes variées
- 17 nouveaux tests unitaires

**Frontend (Nuxt + PrimeVue) :**
- `useAssignment.ts` : composable avec tous les appels API
- `pages/grades/assignments/new.vue` : création de devoir (brouillon ou publication directe)
- `pages/grades/assignments/[id].vue` : grille de notation avec saisie inline
- `pages/grades/classes/[classId].vue` : carnet matriciel élèves × devoirs
- Nav + dashboard mis à jour avec liens "Carnet de notes" et "+ Nouveau devoir"
- `TeacherClassStudentTable` : bouton "Carnet" par classe

**How to apply:** Pour continuer sur cette base, lancer `bunx prisma migrate dev` dans grade-service pour appliquer la migration et régénérer le client.

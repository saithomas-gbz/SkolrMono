---
name: scaffold-feature-pr
description: Crée une issue GitHub pour une nouvelle feature/tâche puis scaffold une branche + PR liée (commit vide, corps de PR standard), en suivant le workflow établi de ce repo (voir PRs #96, #114, #115, #116, #117, #118). À utiliser quand l'utilisateur demande de "démarrer une nouvelle feature", "créer une issue et une PR pour X", "scaffolder une branche pour l'issue #N", ou veut initier un nouveau chantier en suivant la convention issue→branche→PR du projet SkolrMono.
argument-hint: <description de la feature/tâche, ou numéro d'issue existant>
user-invocable: true
---

# Scaffold issue + branche + PR (convention SkolrMono)

Ce repo suit un workflow précis et répété pour démarrer une nouvelle feature (observé sur les PRs #96, #114, #115, #116, #117, #118) : une issue GitHub décrit le besoin, une branche nommée `<numéro>-<slug>` est créée (éventuellement empilée sur une autre PR ouverte), un commit vide scaffold la branche, puis une PR est ouverte immédiatement avec un corps standard — le code arrive dans des commits ultérieurs.

Cette skill reproduit ce workflow à l'identique. Ne pas improviser un format différent : coller aux templates ci-dessous.

## Steps

1. **Comprendre la demande.** Si l'utilisateur donne un numéro d'issue déjà existant, passer directement à l'étape 5 (déterminer la branche de base) en réutilisant le numéro/titre de cette issue (`gh issue view <N>`). Sinon, passer à l'étape 2 pour créer une nouvelle issue.

2. **Rédiger un brouillon d'issue** (titre + corps), toujours en français :
   - Toujours une section `## Description` en tête.
   - Pour une tâche large/epic multi-lot, ajouter `## Contexte`, `## Objectif`, `## Périmètre` (avec une checklist) — sinon rester simple avec juste `## Description`.
   - Toujours terminer par une checklist `### Acceptance criteria` en `- [ ]`, listant les critères concrets de complétion (endpoints à créer, pages à créer, etc.).
   - Si le périmètre technique est déjà clair, ajouter `## Fichiers impactés` avec un tableau `| Fichier | Changement |`.
   - Exemple réel (issue #96, tronqué) :
     ```markdown
     ## Description

     Le `grade-service` ne propose aucun endpoint d'agrégation ou de statistiques...

     ### Endpoints backend à créer

     - `GET /grades/stats/class/:classId` → moyenne de classe par matière, distribution des notes
     - `GET /grades/stats/user/:userId` → moyenne générale, évolution dans le temps, rang dans la classe

     ### Interface frontend

     - Page statistiques accessible aux `ADMIN` et `TEACHER`

     ### Acceptance criteria

     - [ ] Endpoint `GET /grades/stats/class/:classId` opérationnel
     - [ ] Endpoint `GET /grades/stats/user/:userId` opérationnel

     ## Fichiers impactés

     | Fichier | Changement |
     |---|---|
     | `grade-service/src/controllers/gradeController.ts` | Nouveaux handlers stats |
     ```

3. **Montrer le brouillon d'issue à l'utilisateur et attendre une confirmation explicite** avant de créer quoi que ce soit sur GitHub. Créer une issue, pousser une branche, ouvrir une PR sont des actions visibles/partagées — ne jamais les enchaîner silencieusement sans validation.

4. **Créer l'issue** :
   ```sh
   gh issue create --title "<titre>" --body-file <fichier-body.md>
   ```
   Récupérer le numéro d'issue retourné (ou via `gh issue list --limit 1 --json number,title`).

5. **Déterminer la branche de base.**
   - Par défaut : `main`.
   - Si la nouvelle feature dépend d'un placeholder/UI pas encore mergé d'une autre PR actuellement ouverte (ex. un widget stub qui référence explicitement cette issue), proposer d'empiler la nouvelle branche sur la branche de cette PR ouverte plutôt que sur `main` — expliquer pourquoi et demander confirmation si ce n'est pas évident.
   - Exemple réel : la PR #118 (issue #96) s'est empilée sur la branche de la PR #117 (issue #97) parce que `ClassAverageWidget.vue`, ajouté par #117, contenait un placeholder référençant explicitement l'issue #96.

6. **Dériver le nom de branche** : `<numéro-issue>-<slug-du-titre>`.
   - Minuscules, espaces → tirets, apostrophes/parenthèses supprimés.
   - Les accents peuvent être conservés (observé sur les branches réelles, ex. `95-export-bulletin-de-notes-en-pdf-par-élève`) mais ce n'est pas obligatoire.
   - Si le titre est long, raccourcir le slug à l'essentiel plutôt que reproduire le titre complet (ex. issue #114 "Fusionner les microservices..." → branche `114-micro-service`).

7. **Créer la branche** depuis la base déterminée à l'étape 5 :
   ```sh
   git checkout <base> && git pull && git checkout -b <numéro>-<slug>
   ```

8. **Commit vide de scaffold** — jamais de fichier stub, un commit réellement vide :
   ```sh
   git commit --allow-empty -m "chore: scaffold branch for issue #<N> (<résumé court>)" -m "<corps expliquant l'empilement le cas échéant>"
   ```
   Exemple réel (commit `fa0bc71`, issue #96 empilée sur #117) :
   ```
   chore: scaffold branch for issue #96 (statistiques et moyennes)

   Branche empilée sur #97 (dashboard enseignant) — le widget "Moyenne de
   classe" y est actuellement un placeholder référençant cette issue. Pas de
   code pour l'instant : cette branche/PR sert de point de départ pour
   enchaîner le travail sans attendre le merge de #117.
   ```
   Si la branche n'est pas empilée, le corps du commit peut simplement dire qu'il n'y a pas encore de code, cette branche servant de point de départ.

9. **Pousser la branche** :
   ```sh
   git push -u origin <numéro>-<slug>
   ```

10. **Ouvrir la PR** avec `gh pr create --base <base>` et le corps standard suivant (toujours en français) :
    ```markdown
    ## Description

    fixes #<N>

    [Si empilée : prose expliquant pourquoi, sur le modèle de la PR #118 —
    nom de la PR de base, raison du chaînage, ce que cette PR viendra
    remplacer/compléter.]

    [1-2 phrases décrivant ce qui sera implémenté dans cette PR.]

    ## Testing

    - [ ] À définir une fois l'implémentation démarrée.

    🤖 Generated with [Claude Code](https://claude.com/claude-code)
    ```
    Utiliser `--body-file` avec un fichier temporaire plutôt que `--body` inline pour préserver la mise en forme Markdown.

11. **Rapporter** à l'utilisateur l'URL de l'issue créée et l'URL de la PR ouverte.

## Notes

- Toujours rédiger issue et PR en français — c'est la langue de toutes les issues/PRs existantes du repo.
- Le commit de scaffold est réellement vide (`--allow-empty`) : ne jamais y ajouter un fichier stub ou un README de branche.
- Ne jamais sauter l'étape de confirmation (3) : la création d'issue, le push de branche et l'ouverture de PR sont des actions visibles sur le repo GitHub partagé.
- Si l'utilisateur ne précise pas s'il faut empiler sur une autre PR, vérifier l'état des PRs ouvertes (`gh pr list --state open`) pour repérer une dépendance évidente avant de trancher — ne pas empiler par défaut sans raison concrète.

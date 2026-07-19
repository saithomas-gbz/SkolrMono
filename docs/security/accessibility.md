# Audit d'accessibilité — référentiel et actions mises en œuvre (#156)

> Référentiel choisi, sous-ensemble audité et correctifs appliqués sur le frontend Skolr, réalisés pour la soutenance RNCP 39583 (compétence C2.2.3). Même format que `docs/security/audit.md` : constat → correctif → statut.

| Champ | Valeur |
|-------|--------|
| Périmètre | Frontend Nuxt/Vue (SPA), coquille de navigation et thème applicatif |
| Référentiel | RGAA 4.1 — sous-ensemble documenté (voir ci-dessous) |
| Version | 1.0.0 |
| Date | 2026-07-19 |
| Méthode | Revue de code ciblée, calcul de contraste WCAG (formule de luminance relative), test clavier manuel, `eslint-plugin-vuejs-accessibility` |
| Hors scope | Audit RGAA complet (106 critères), audit outillé automatisé (axe-core / Lighthouse CI), `aria-describedby` sur les messages d'erreur de formulaire |

---

## Pourquoi RGAA plutôt qu'OPQUAST

RGAA est le référentiel français officiel, construit directement sur WCAG 2.1 AA — c'est le choix reconnu et attendu pour une compétence centrée spécifiquement sur l'accessibilité aux personnes en situation de handicap. OPQUAST (240 bonnes pratiques qualité web : SEO, sécurité, perf, accessibilité mêlées) est plus large mais moins ciblé.

Un audit RGAA complet (106 critères) est disproportionné pour un projet solo. Plutôt que d'ignorer RGAA pour cette raison, ou de prétendre à une couverture complète invérifiable, cette passe reprend la même démarche honnête que `docs/security/audit.md` : auditer un **sous-ensemble de thématiques réellement pertinentes** pour cette application (SPA, mono-langue, sans média ni iframe), et déclarer explicitement le reste hors scope.

**Thématiques couvertes** : 3 (Couleurs/contraste), 6 (Liens), 7 (Scripts/composants d'interface), 8 (Éléments obligatoires : langue, structure), 9 (Structuration/landmarks), 11 (Formulaires), 12 (Navigation).

**Thématiques hors scope** : 1 Images (aucun `<img>` porteur de sens, icônes `pi pi-*` décoratives), 2 Cadres (aucun iframe), 4 Multimédia (aucun audio/vidéo), 5 Tableaux de données (PrimeVue DataTable, spot-check seulement, non audité exhaustivement).

---

## Synthèse

| # | Critère RGAA | Constat avant | Correctif | Statut après |
|---|--------------|----------------|-----------|--------------|
| A1 | 8.3 — Langue de la page | ❌ `<html lang>` non posé | ✅ `useHead({ htmlAttrs: { lang: 'fr' } })` | ✅ |
| A2 | 7.1 — Compatibilité clavier | ❌ Menu utilisateur (`Avatar`) inopérable au clavier | ✅ Enveloppé dans un `Button` PrimeVue natif | ✅ |
| A3 | 9.1 / 12.x — Navigation, état actif | ❌ Item actif visuel seulement (classe CSS) | ✅ `aria-current="page"` sur le lien actif | ✅ |
| A4 | 12.6/12.7 — Lien d'évitement | ❌ Aucun lien d'évitement | ✅ Lien "Aller au contenu principal" visible au focus | ✅ |
| A5 | 9.1 — Landmark espace invité | ❌ `<div>` sans landmark (login, register…) | ✅ `<main id="main-content">` | ✅ |
| A6 | 3.2 — Contraste texte atténué | ❌ 3.66:1 / 3.57:1 (sous 4.5:1) | ✅ Mix 55%→65% → 4.96:1 / 4.78:1 | ✅ |
| A7 | 3.2 — Contraste boutons primaires | ❌ Blanc sur accent-500 : 4.20:1 | ✅ accent-600 en fond : 4.74:1 | ✅ |
| A8 | 11.1 — Étiquettes de formulaires | ✅ Déjà conforme (spot-check) | — | ✅ Vérifié |
| A9 | 7.1 — Compatibilité clavier (listes cliquables) | ❌ Notifications et conversations : `<li @click>` sans équivalent clavier | ✅ `role="button"`, `tabindex="0"`, `@keydown.enter`/`@keydown.space` | ✅ |

---

## Détail des actions

### A1 — Langue de la page
**Constat** : `@nuxtjs/i18n` ne pose `<html lang>` que si `experimental.strictSeo` est activé, ce qui n'est pas le cas (activer ce flag apporterait aussi du comportement canonical/hreflang non pertinent pour une app mono-langue derrière authentification).
**Correctif** : `useHead({ htmlAttrs: { lang: 'fr' } })` posé directement dans `app.vue`.
**Vérifié** : `<html lang="fr">` présent dans le DOM rendu.

### A2 — Menu utilisateur accessible au clavier
**Constat** : le déclencheur du menu utilisateur (`TopBar.vue`) était un `Avatar` PrimeVue (rendu `<div>`) avec seulement `@click`, sans `tabindex`/`role`/gestion clavier — inopérable au clavier (échec WCAG 2.1.1).
**Correctif** : l'`Avatar` est désormais enveloppé dans un `Button` PrimeVue (`text rounded`), qui rend un vrai `<button>` sémantique. `aria-label` dynamique (`nav.open_user_menu`) posé sur le bouton ; l'`Avatar` interne devient `aria-hidden="true"` (purement visuel).
**Vérifié** : `Tab` atteint le bouton, `Enter`/`Espace` ouvre le menu (comportement natif du `<button>`).

### A3 — Navigation principale : état actif exposé
**Constat** : `NavRail.vue` et `BottomTabBar.vue` n'exposaient l'item de navigation actif que par une classe CSS, invisible pour un lecteur d'écran ; `NavRail` n'avait pas non plus de `aria-label` sur son landmark `<nav>`.
**Correctif** : `aria-current="page"` sur le lien actif (les deux composants), `aria-label` sur les deux `<nav>` (harmonisation — `NavRail` et `BottomTabBar` sont mutuellement exclusifs via CSS `display:none`, donc un seul landmark est exposé à la fois, mais les labelliser tous les deux est une robustesse à coût nul).
**Vérifié** : navigation par landmarks (VoiceOver) annonce une seule région "navigation" nommée ; l'item actif est annoncé "page actuelle".

### A4 — Lien d'évitement
**Constat** : aucun moyen de sauter directement au contenu principal sans traverser toute la navigation à chaque page.
**Correctif** : lien `#main-content` ajouté en premier enfant de `AppShell.vue`, hors-écran par défaut, visible uniquement au focus clavier (ne modifie pas le rendu visuel normal).
**Vérifié** : premier `Tab` sur une page fait apparaître le lien et le focus saute vers `<main id="main-content">`.

### A5 — Landmark sur l'espace invité
**Constat** : la branche non-connectée de `layouts/default.vue` (login, register, mot de passe oublié…) rendait un `<div class="guest-root">` sans aucun landmark.
**Correctif** : remplacé par `<main id="main-content" class="guest-root">`.
**Vérifié** : navigation par landmarks fonctionne aussi sur les pages d'authentification.

### A6 — Contraste du texte atténué
**Constat / calcul** : `--skolr-color-text-muted` (mix 55% de `--skolr-color-text` sur transparent) donnait 3.66:1 sur `--skolr-color-bg` et 3.57:1 sur `--skolr-color-surface` — sous le seuil AA de 4.5:1 pour du texte normal. Calcul fait par la formule de luminance relative WCAG (pas à l'œil), confirmé par le contrast checker des devtools.
**Correctif** : mix porté à 65% dans `tokens.css` → 4.96:1 / 4.78:1.
**Vérifié** : ratios recalculés ≥ 4.5:1 sur les deux fonds d'usage.

### A7 — Contraste des boutons primaires
**Constat / calcul** : le texte blanc des boutons PrimeVue "primary" (fond `#ec3013`, accent-500) donnait 4.20:1, sous 4.5:1.
**Correctif** : d'abord tenté via une surcharge globale des tokens compilés (`--p-button-primary-background` dans `tokens.css`) — **inefficace en pratique** : PrimeVue injecte au runtime son propre `:root { --p-button-primary-background: var(--p-primary-color); ... }`, placé plus tard dans le document que la feuille de style statique du projet ; à spécificité CSS égale, c'est la déclaration la plus tardive qui l'emporte, donc la surcharge globale était silencieusement écrasée (vérifié en inspectant le HTML rendu : une seule déclaration survivait, celle de PrimeVue). Corrigé en passant par la surcharge de composant `components.button.colorScheme.light.root.primary.*` dans `themes/skolr.ts` (`{primary.600}`/`{primary.700}`), qui fait partie de la même génération de thème que PrimeVue — plus de conflit d'ordre possible.
**Vérifié** : `--p-button-primary-background` résout vers `--p-primary-600` (`#dd2b0f`) dans le HTML rendu, confirmé après correction (une seule déclaration désormais, contre deux en conflit avant) — 4.74:1.

### A8 — Étiquettes de formulaires
**Constat / vérification** : spot-check sur les formulaires d'authentification (login, register) — les champs PrimeVue InputText utilisent correctement `label`/`for`+`id` ou `aria-label`.
**Statut** : conforme, aucun correctif nécessaire dans le périmètre audité.

### A9 — Compatibilité clavier des listes cliquables
**Constat** : `NotificationBell.vue` (liste de notifications) et `pages/messages.vue` (liste de conversations) utilisaient des `<li @click="...">` — élément non interactif avec gestionnaire de clic mais sans équivalent clavier (détecté par `eslint-plugin-vuejs-accessibility/click-events-have-key-events`, pas une trouvaille manuelle).
**Correctif** : `role="button"`, `tabindex="0"`, `@keydown.enter` et `@keydown.space.prevent` ajoutés sur les deux éléments, appelant le même handler que `@click`.
**Vérifié** : `bun run lint` → 0 erreur, 0 avertissement (le lint local avait initialement affiché 2 avertissements sur ces deux fichiers, corrigés plutôt que juste passés en `warn`).

---

## Contrôles ponctuels (spot-check, thématiques non corrigées)

| Thématique | Constat |
|------------|---------|
| Focus visible | Défauts PrimeVue Aura (contour au focus sur boutons/liens/champs) non surchargés — conformes tels quels |
| Tableaux de données (PrimeVue DataTable) | En-têtes de colonnes structurés nativement par le composant ; non audité exhaustivement (hors scope) |
| ESLint a11y | `eslint-plugin-vuejs-accessibility` (règles `flat/recommended`) activé sur `packages/frontend/**/*.vue` dans `eslint.config.js` et câblé dans `.github/workflows/frontend.yaml` (`bun run lint`, absent auparavant) — 0 erreur, 0 avertissement sur les 75 fichiers `.vue` (les 2 avertissements initiaux ont été corrigés, voir A9) |

---

## Perspectives (hors scope de cette passe)

- Audit RGAA complet (106 critères) si le produit devient public.
- Audit outillé automatisé (axe-core / Lighthouse CI) en complément de la revue manuelle.
- `aria-describedby` entre les messages d'erreur de formulaire (`<small class="p-error">`) et leurs champs — gap RGAA 11.9 réel mais touchant trop de fichiers pour ce passage.

---

## Vérification

- Test clavier manuel : lien d'évitement, menu utilisateur (`Enter`/`Espace`/`Échap`), focus visible sur la navigation.
- Vérification devtools (contraste) : `text-muted` et bouton primaire ≥ 4.5:1, confirmée indépendamment du calcul.
- `bun run lint` (racine, inclut `eslint-plugin-vuejs-accessibility`) : 0 erreur.
- `bun run i18n:check` : clés `nav.main_navigation` / `nav.skip_to_content` / `nav.open_user_menu` déclarées et utilisées.

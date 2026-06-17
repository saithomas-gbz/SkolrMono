/**
 * Miroir JS des tokens CSS Skolr (app/assets/css/tokens.css) pour les contextes
 * canvas (Chart.js, FullCalendar) qui n'interprètent pas `var()`.
 */

export const SKOLR_BRAND = {
  navy: '#12263a',
  cream: '#ede5a6',
  green: '#498467',
  text: '#1a1a1a',
} as const;

const PRIMARY_GREEN = { fill: '#498467', hover: '#3d6f57', border: '#325a46' } as const;

/** Couleurs des barres (GradesChart) et de la ligne (GradesTrendChart). */
export const CHART_PRIMARY = PRIMARY_GREEN;
export const CHART_PRIMARY_AREA_FILL = 'rgba(73, 132, 103, 0.12)';

/** Palette matières du calendrier (WeeklyCalendar) — hash déterministe sur courseId. */
export const SUBJECT_PALETTE = [
  { bg: '#498467', border: '#355f4a' }, // vert
  { bg: '#12263a', border: '#0b1723' }, // navy
  { bg: '#d4c12b', border: '#998b1f' }, // doré
  { bg: '#c16333', border: '#8b4725' }, // terracotta
  { bg: '#35818d', border: '#265d65' }, // teal
  { bg: '#874587', border: '#613261' }, // prune
] as const;

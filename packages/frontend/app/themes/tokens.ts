/**
 * Miroir JS des tokens CSS Skolr "Modernist" (app/assets/css/tokens.css) pour
 * les contextes canvas (Chart.js, FullCalendar) qui n'interprètent pas `var()`.
 */

const PRIMARY_ACCENT = { fill: '#ec3013', hover: '#dd2b0f', border: '#ae1800' } as const;

/** Couleurs des barres (GradesChart) et de la ligne (GradesTrendChart). */
export const CHART_PRIMARY = PRIMARY_ACCENT;
export const CHART_PRIMARY_AREA_FILL = 'rgba(236, 48, 19, 0.12)';

/**
 * Palette matières du calendrier (WeeklyCalendar) — hash déterministe sur
 * courseId. Fonds pâles + bordure gauche saturée + texte foncé, comme les
 * `.block`/`.block.b2`/`.block.b3` du sketch (pas de blocs pleins).
 */
export const SUBJECT_PALETTE = [
  { bg: '#fff2ef', border: '#ec3013', text: '#7c1405' }, // accent
  { bg: '#f8f4f4', border: '#201e1d', text: '#2d2b2b' }, // encre
  { bg: '#fff2ef', border: '#ef6853', text: '#71261b' }, // accent-2
  { bg: '#fdf8e3', border: '#d4c12b', text: '#7a6f18' }, // doré
  { bg: '#e8f3f4', border: '#35818d', text: '#1f4c52' }, // teal
  { bg: '#f0efef', border: '#7d7979', text: '#3a3838' }, // neutre
] as const;

<template>
  <div class="weekly-calendar">
    <FullCalendar :options="calendarOptions" />
  </div>
</template>

<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3';

const { t } = useI18n();
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import type { Session } from '~/composables/usePlanning';
import { SUBJECT_PALETTE } from '~/themes/tokens';

const props = defineProps<{
  sessions: Session[];
  courseNames?: Map<string, string>;
  teacherNames?: Map<string, string>;
  /** Autorise la création d'une séance par clic sur un créneau vide. */
  canCreate?: boolean;
  /** Id du prof connecté : ses séances sont mises en évidence (vue classe). */
  currentUserId?: string | null;
  /**
   * Séances dont l'enseignant est déclaré absent.
   *
   * Déclarer une absence sert à prévenir : sans cette information, le créneau
   * s'affichait à l'identique dans l'emploi du temps de la classe, et les élèves
   * se présentaient à un cours qui n'aurait pas lieu.
   */
  absentTeacherSessionIds?: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'session-click', session: Session): void;
  (e: 'slot-click', date: Date): void;
}>();

const sessions       = computed(() => props.sessions);
const courseNames    = computed(() => props.courseNames);
const teacherNames   = computed(() => props.teacherNames);
const currentUserId  = computed(() => props.currentUserId);
const canCreate      = computed(() => props.canCreate);
const seancesSansProf = computed(() => props.absentTeacherSessionIds ?? new Set<string>());

// Couleur par matière (déterministe sur courseId)
function courseColor(courseId: string) {
  const hash = courseId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length]!;
}

const events = computed(() =>
  sessions.value.map((s) => {
    const color       = courseColor(s.courseId);
    const courseName  = courseNames.value?.get(s.courseId) ?? null;
    const teacherName = teacherNames.value?.get(s.teacherId) ?? null;
    const isMine      = currentUserId.value != null && s.teacherId === currentUserId.value;
    const sansProf    = seancesSansProf.value.has(s.id);
    return {
      id: s.id,
      title: courseName ?? '',
      start: s.startAt,
      end: s.endAt,
      extendedProps: {
        session: s,
        courseName,
        teacherName,
        isMine,
        sansProf,
        accentColor: color.border,
        textColor: color.text,
      },
      backgroundColor: color.bg,
      borderColor: 'transparent',
      classNames: [...(isMine ? ['is-mine'] : []), ...(sansProf ? ['is-teacher-absent'] : [])],
    };
  }),
);

/**
 * Ces valeurs sont interpolées dans du HTML brut, que FullCalendar injecte tel
 * quel. Un nom de salle ou de matière contenant des chevrons s'exécuterait :
 * ils viennent de l'administration, mais rien ne garantit qu'ils resteront
 * toujours saisis par elle.
 */
function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEventHtml(
  courseName: string | null,
  teacherName: string | null,
  room: string | null,
  accentColor: string,
  textColor: string,
  enseignantAbsent: boolean,
  libelleAbsent: string,
): string {
  const courseEl  = courseName  ? `<span class="ev-course">${echapper(courseName)}</span>`   : '';
  const teacherEl = teacherName ? `<span class="ev-teacher">${echapper(teacherName)}</span>` : '';
  const roomEl    = room        ? `<span class="ev-room">🏫 ${echapper(room)}</span>`        : '';
  const absentEl  = enseignantAbsent
    ? `<span class="ev-absent">${echapper(libelleAbsent)}</span>`
    : '';
  const style = `border-left:3px solid ${accentColor}; color:${textColor}`;
  return `<div class="ev-body" style="${style}">${courseEl}${teacherEl}${roomEl}${absentEl}</div>`;
}

function handleEventClick(arg: EventClickArg) {
  const session = arg.event.extendedProps['session'] as Session;
  emit('session-click', session);
}

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  locale: 'fr',
  firstDay: 1,
  slotMinTime: '08:00:00',
  slotMaxTime: '19:00:00',
  slotDuration: '00:30:00',
  allDaySlot: false,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: '',
  },
  buttonText: { today: t('planning.today'), prev: '‹', next: '›' },
  events: events.value,
  eventContent: (arg) => {
    const { courseName, teacherName, session, accentColor, textColor, sansProf } = arg.event
      .extendedProps as {
      session: Session;
      courseName: string | null;
      teacherName: string | null;
      accentColor: string;
      textColor: string;
      sansProf: boolean;
    };
    return {
      html: buildEventHtml(
        courseName,
        teacherName,
        session.room,
        accentColor,
        textColor,
        sansProf,
        t('planning.teacher_absent'),
      ),
    };
  },
  eventClick: handleEventClick,
  dateClick: canCreate.value ? (arg) => emit('slot-click', arg.date) : undefined,
  height: 'auto',
  expandRows: true,
  nowIndicator: true,
  slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
}));
</script>

<style scoped>
.weekly-calendar {
  width: 100%;
}

/*
 * Séance dont l'enseignant est absent : le créneau reste visible — il occupe
 * toujours la grille et l'information « ce cours n'aura pas lieu » compte plus
 * que le cours lui-même — mais il est désaturé et barré pour se distinguer au
 * premier coup d'oeil d'un cours assuré.
 */
.weekly-calendar :deep(.fc-event.is-teacher-absent) {
  opacity: 0.55;
}

.weekly-calendar :deep(.fc-event.is-teacher-absent .ev-course),
.weekly-calendar :deep(.fc-event.is-teacher-absent .ev-teacher) {
  text-decoration: line-through;
}

.weekly-calendar :deep(.ev-absent) {
  display: block;
  margin-top: 2px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.weekly-calendar :deep(.fc) {
  font-family: inherit;
  font-size: 0.875rem;
  --fc-border-color: var(--skolr-color-divider);
  --fc-now-indicator-color: var(--skolr-color-accent);
  --fc-today-bg-color: var(--skolr-color-accent-100);
}

.weekly-calendar :deep(.fc-button) {
  border-radius: 0;
  background: var(--p-primary-color);
  border-color: var(--p-primary-color);
}

.weekly-calendar :deep(.fc-button:hover) {
  background: var(--p-primary-hover-color, var(--p-primary-color));
  border-color: var(--p-primary-hover-color, var(--p-primary-color));
}

.weekly-calendar :deep(.fc-button-active) {
  background: var(--p-primary-active-color, var(--p-primary-color));
  border-color: var(--p-primary-active-color, var(--p-primary-color));
}

.weekly-calendar :deep(.fc-event) {
  cursor: pointer;
  border-radius: 0;
  overflow: hidden;
}

/* Séances du prof connecté : bordure marquée + léger halo (vue classe) */
.weekly-calendar :deep(.fc-event.is-mine) {
  border-width: 2px;
  box-shadow: 0 0 0 1px var(--p-primary-color) inset;
}

.weekly-calendar :deep(.fc-timegrid-slot) {
  height: 2.5rem;
}

/* Contenu custom des événements */
.weekly-calendar :deep(.ev-body) {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 2px 4px;
  line-height: 1.3;
  overflow: hidden;
}

.weekly-calendar :deep(.ev-course) {
  font-weight: 700;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.weekly-calendar :deep(.ev-teacher) {
  font-size: 0.75rem;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.weekly-calendar :deep(.ev-room) {
  font-size: 0.7rem;
  opacity: 0.8;
}
</style>

<template>
  <div class="weekly-calendar">
    <FullCalendar :options="calendarOptions" />
  </div>
</template>

<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import type { Session } from '~/composables/usePlanning';

const props = defineProps<{
  sessions: Session[];
  courseNames?: Map<string, string>;
  teacherNames?: Map<string, string>;
  canEdit?: boolean;
}>();

const emit = defineEmits<{
  (e: 'session-click', session: Session): void;
  (e: 'slot-click', date: Date): void;
}>();

// Palette de couleurs par matière (déterministe sur courseId)
const PALETTE = [
  { bg: '#3b82f6', border: '#2563eb' }, // bleu
  { bg: '#10b981', border: '#059669' }, // vert
  { bg: '#f59e0b', border: '#d97706' }, // ambre
  { bg: '#8b5cf6', border: '#7c3aed' }, // violet
  { bg: '#ec4899', border: '#db2777' }, // rose
  { bg: '#ef4444', border: '#dc2626' }, // rouge
];

function courseColor(courseId: string) {
  const hash = courseId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length]!;
}

const events = computed(() =>
  props.sessions.map((s) => {
    const color       = courseColor(s.courseId);
    const courseName  = props.courseNames?.get(s.courseId) ?? null;
    const teacherName = props.teacherNames?.get(s.teacherId) ?? null;
    return {
      id: s.id,
      title: courseName ?? '',
      start: s.startAt,
      end: s.endAt,
      extendedProps: { session: s, courseName, teacherName },
      backgroundColor: color.bg,
      borderColor: color.border,
    };
  }),
);

function buildEventHtml(
  courseName: string | null,
  teacherName: string | null,
  room: string | null,
): string {
  const courseEl  = courseName  ? `<span class="ev-course">${courseName}</span>`   : '';
  const teacherEl = teacherName ? `<span class="ev-teacher">${teacherName}</span>` : '';
  const roomEl    = room        ? `<span class="ev-room">🏫 ${room}</span>`        : '';
  return `<div class="ev-body">${courseEl}${teacherEl}${roomEl}</div>`;
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
  buttonText: { today: "Aujourd'hui", prev: '‹', next: '›' },
  events: events.value,
  eventContent: (arg) => {
    const { courseName, teacherName, session } = arg.event.extendedProps as {
      session: Session;
      courseName: string | null;
      teacherName: string | null;
    };
    return { html: buildEventHtml(courseName, teacherName, session.room) };
  },
  eventClick: handleEventClick,
  dateClick: props.canEdit ? (arg) => emit('slot-click', arg.date) : undefined,
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

.weekly-calendar :deep(.fc) {
  font-family: inherit;
  font-size: 0.875rem;
}

.weekly-calendar :deep(.fc-button) {
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
  border-radius: 4px;
  overflow: hidden;
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

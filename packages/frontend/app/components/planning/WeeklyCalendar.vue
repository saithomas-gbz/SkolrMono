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
  canEdit?: boolean;
}>();

const emit = defineEmits<{
  (e: 'session-click', session: Session): void;
  (e: 'slot-click', date: Date): void;
}>();

const events = computed(() =>
  props.sessions.map((s) => ({
    id: s.id,
    title: s.room ? `Salle ${s.room}` : 'Sans salle',
    start: s.startAt,
    end: s.endAt,
    extendedProps: { session: s },
    backgroundColor: 'var(--p-primary-color)',
    borderColor: 'var(--p-primary-color)',
  })),
);

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
  eventClick: handleEventClick,
  dateClick: props.canEdit
    ? (arg) => emit('slot-click', arg.date)
    : undefined,
  height: 'auto',
  expandRows: true,
  nowIndicator: true,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
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
  padding: 2px 4px;
}

.weekly-calendar :deep(.fc-timegrid-slot) {
  height: 2.5rem;
}
</style>

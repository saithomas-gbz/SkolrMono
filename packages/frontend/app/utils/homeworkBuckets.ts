export type HomeworkItem = {
  assignmentId: string;
  subject: string;
  title: string;
  dueAt: Date | null;
  done: boolean;
};

export type BucketedHomeworkItem = HomeworkItem & { overdue: boolean };

export type HomeworkBuckets = {
  thisWeek: BucketedHomeworkItem[];
  nextWeek: BucketedHomeworkItem[];
  done: BucketedHomeworkItem[];
};

/** Lundi 00:00 de la semaine de `date` — aligné sur `firstDay: 1` de FullCalendar/WeeklyCalendar. */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Répartit les devoirs en 3 colonnes (This week / Next week / Done), comme
 * l'écran Homework du sketch. "Done" = le prof a statué (GRADED/ABSENT/
 * EXEMPT), pas un dépôt élève (aucune notion de rendu dans ce modèle de
 * données). Un devoir en retard et toujours PENDING remonte dans "This week"
 * avec `overdue: true` plutôt que d'être silencieusement classé ailleurs.
 * Au-delà de la semaine prochaine, les devoirs ne sont pas affichés (comme
 * dans le sketch, qui ne montre que 2 semaines).
 */
export function bucketHomework(items: HomeworkItem[], now: Date = new Date()): HomeworkBuckets {
  const thisWeekStart = startOfWeek(now);
  const thisWeekEnd = addDays(thisWeekStart, 7);
  const nextWeekEnd = addDays(thisWeekEnd, 7);

  const buckets: HomeworkBuckets = { thisWeek: [], nextWeek: [], done: [] };

  for (const item of items) {
    if (item.done) {
      buckets.done.push({ ...item, overdue: false });
      continue;
    }
    const overdue = item.dueAt !== null && item.dueAt < now;
    if (overdue) {
      buckets.thisWeek.push({ ...item, overdue: true });
      continue;
    }
    if (!item.dueAt || item.dueAt < thisWeekEnd) {
      buckets.thisWeek.push({ ...item, overdue: false });
    } else if (item.dueAt < nextWeekEnd) {
      buckets.nextWeek.push({ ...item, overdue: false });
    }
    // Au-delà de la semaine prochaine : pas affiché.
  }

  const byDueDate = (a: BucketedHomeworkItem, b: BucketedHomeworkItem) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.getTime() - b.dueAt.getTime();
  };
  buckets.thisWeek.sort(byDueDate);
  buckets.nextWeek.sort(byDueDate);
  buckets.done.sort((a, b) => byDueDate(b, a));

  return buckets;
}

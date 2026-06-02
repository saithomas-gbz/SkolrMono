/**
 * Stable dev fixtures shared across service seeds (auth → class → grade).
 * Single source of truth: keep auth/class/grade seeds consuming these exports
 * so the three databases stay in sync.
 */
const DEV_USER_IDS = {
  admin: '11111111-1111-1111-1111-111111111101',
  user: '11111111-1111-1111-1111-111111111102',
  teacher: '11111111-1111-1111-1111-111111111103',
  student: '11111111-1111-1111-1111-111111111104',
} as const;

const DEV_CLASS_IDS = {
  cm2a: '22222222-2222-2222-2222-222222222201',
  sciences6: '22222222-2222-2222-2222-222222222202',
} as const;

const DEV_COURSE_IDS = {
  maths: '33333333-3333-3333-3333-333333333302',
  sciences: '33333333-3333-3333-3333-333333333303',
  francais: '33333333-3333-3333-3333-333333333304',
  histoire: '33333333-3333-3333-3333-333333333305',
} as const;

export const DEV_TEACHER_PASSWORD = 'dev-teacher-123';
export const DEV_STUDENT_PASSWORD = 'dev-student-123';

type DevClass = { id: string; name: string; description: string };

export const DEV_CLASSES: DevClass[] = [
  { id: DEV_CLASS_IDS.cm2a, name: 'CM2-A', description: 'Classe de démonstration — primaire' },
  { id: DEV_CLASS_IDS.sciences6, name: '6ème Sciences', description: 'Classe de démonstration — collège' },
];

type DevCourse = { id: string; name: string; description: string };

export const DEV_COURSES: DevCourse[] = [
  { id: DEV_COURSE_IDS.maths, name: 'Mathématiques', description: 'Cours de démonstration — maths' },
  { id: DEV_COURSE_IDS.sciences, name: 'Sciences', description: 'Cours de démonstration — sciences' },
  { id: DEV_COURSE_IDS.francais, name: 'Français', description: 'Cours de démonstration — français' },
  {
    id: DEV_COURSE_IDS.histoire,
    name: 'Histoire-Géographie',
    description: 'Cours de démonstration — histoire-géo',
  },
];

type DevTeacher = { id: string; email: string; name: string; classIds: string[] };

/** 4 enseignants supplémentaires, co-profs des classes (le prof principal reste `dev.teacher`). */
export const DEV_TEACHERS: DevTeacher[] = [
  {
    id: '55555555-5555-5555-5555-000000000001',
    email: 'prof.maths@skolr.local',
    name: 'Camille Maths',
    classIds: [DEV_CLASS_IDS.cm2a],
  },
  {
    id: '55555555-5555-5555-5555-000000000002',
    email: 'prof.sciences@skolr.local',
    name: 'Sofia Sciences',
    classIds: [DEV_CLASS_IDS.sciences6],
  },
  {
    id: '55555555-5555-5555-5555-000000000003',
    email: 'prof.francais@skolr.local',
    name: 'Lucas Français',
    classIds: [DEV_CLASS_IDS.cm2a],
  },
  {
    id: '55555555-5555-5555-5555-000000000004',
    email: 'prof.histoire@skolr.local',
    name: 'Nadia Histoire',
    classIds: [DEV_CLASS_IDS.sciences6],
  },
];

type DevStudent = { id: string; email: string; name: string; classId: string };

const STUDENT_NAMES = [
  'Léa Martin',
  'Hugo Bernard',
  'Emma Dubois',
  'Louis Thomas',
  'Jade Robert',
  'Gabriel Richard',
  'Alice Petit',
  'Raphaël Durand',
  'Chloé Moreau',
  'Arthur Laurent',
  'Manon Simon',
  'Jules Michel',
  'Inès Garcia',
  'Adam Lefebvre',
  'Louise Roux',
  'Nathan Fournier',
  'Camille Girard',
  'Tom Bonnet',
  'Lina Dupont',
  'Maël Lambert',
  'Rose Fontaine',
  'Noah Rousseau',
  'Anna Vincent',
  'Liam Muller',
  'Mila Faure',
  'Ethan Blanc',
  'Sarah Guerin',
  'Paul Chevalier',
] as const;

/** Élèves générés (28) — répartis sur 2 classes distinctes (13 en CM2-A, 15 en 6ème). */
export const DEV_GENERATED_STUDENTS: DevStudent[] = STUDENT_NAMES.map((name, i) => {
  const index = i + 1;
  const id = `44444444-4444-4444-4444-${String(index).padStart(12, '0')}`;
  const classId = index <= 13 ? DEV_CLASS_IDS.cm2a : DEV_CLASS_IDS.sciences6;
  return {
    id,
    email: `eleve.${String(index).padStart(2, '0')}@skolr.local`,
    name,
    classId,
  };
});

/** Comptes de login historiques, également inscrits comme élèves en CM2-A. */
const DEV_LEGACY_STUDENTS: DevStudent[] = [
  {
    id: DEV_USER_IDS.student,
    email: 'dev.student@skolr.local',
    name: 'Dev Student',
    classId: DEV_CLASS_IDS.cm2a,
  },
  {
    id: DEV_USER_IDS.user,
    email: 'dev.user@skolr.local',
    name: 'Dev User',
    classId: DEV_CLASS_IDS.cm2a,
  },
];

/** Tous les élèves inscrits (30 = 2 historiques + 28 générés). */
export const DEV_STUDENTS: DevStudent[] = [...DEV_LEGACY_STUDENTS, ...DEV_GENERATED_STUDENTS];

/** teacherIds attendus par classe (prof principal `dev.teacher` + co-profs). */
export function teacherIdsForClass(classId: string): string[] {
  const extras = DEV_TEACHERS.filter((t) => t.classIds.includes(classId)).map((t) => t.id);
  return [DEV_USER_IDS.teacher, ...extras];
}

/** studentIds inscrits dans une classe donnée. */
export function studentIdsForClass(classId: string): string[] {
  return DEV_STUDENTS.filter((s) => s.classId === classId).map((s) => s.id);
}

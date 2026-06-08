/**
 * Stable dev fixtures shared across service seeds (auth → class → grade).
 * Single source of truth: keep auth/class/grade seeds consuming these exports
 * so the three databases stay in sync.
 */
export const DEV_USER_IDS = {
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

const DEV_SUBJECT_IDS = {
  sciences: 'AAAA0000-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
  lettres: 'BBBB0000-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
  sciencesHumaines: 'CCCC0000-CCCC-CCCC-CCCC-CCCCCCCCCCCC',
} as const;

export const DEV_TEACHER_PASSWORD = 'dev-teacher-123';
export const DEV_STUDENT_PASSWORD = 'dev-student-123';

type DevClass = { id: string; name: string; description: string };

export const DEV_CLASSES: DevClass[] = [
  { id: DEV_CLASS_IDS.cm2a, name: 'CM2-A', description: 'Classe de démonstration — primaire' },
  { id: DEV_CLASS_IDS.sciences6, name: '6ème Sciences', description: 'Classe de démonstration — collège' },
];

type DevSubject = { id: string; name: string; description: string };

export const DEV_SUBJECTS: DevSubject[] = [
  { id: DEV_SUBJECT_IDS.sciences, name: 'Sciences', description: 'Matière sciences (maths, physique, SVT)' },
  { id: DEV_SUBJECT_IDS.lettres, name: 'Lettres', description: 'Matière lettres (français, langues)' },
  { id: DEV_SUBJECT_IDS.sciencesHumaines, name: 'Sciences Humaines', description: 'Matière sciences humaines (histoire, géo)' },
];

const DEV_TOPIC_IDS = {
  trigonometrie: 'DDDD0000-DDDD-DDDD-DDDD-000000000001',
  pythagore: 'DDDD0000-DDDD-DDDD-DDDD-000000000002',
  algebre: 'DDDD0000-DDDD-DDDD-DDDD-000000000003',
  physique: 'DDDD0000-DDDD-DDDD-DDDD-000000000004',
  biologie: 'DDDD0000-DDDD-DDDD-DDDD-000000000005',
  grammaire: 'DDDD0000-DDDD-DDDD-DDDD-000000000006',
  conjugaison: 'DDDD0000-DDDD-DDDD-DDDD-000000000007',
  prehistoire: 'DDDD0000-DDDD-DDDD-DDDD-000000000008',
  antiquite: 'DDDD0000-DDDD-DDDD-DDDD-000000000009',
} as const;

type DevCourse = { id: string; name: string; description: string; subjectId?: string };

export const DEV_COURSES: DevCourse[] = [
  { id: DEV_COURSE_IDS.maths, name: 'Mathématiques', description: 'Cours de démonstration — maths', subjectId: DEV_SUBJECT_IDS.sciences },
  { id: DEV_COURSE_IDS.sciences, name: 'Sciences', description: 'Cours de démonstration — sciences', subjectId: DEV_SUBJECT_IDS.sciences },
  { id: DEV_COURSE_IDS.francais, name: 'Français', description: 'Cours de démonstration — français', subjectId: DEV_SUBJECT_IDS.lettres },
  {
    id: DEV_COURSE_IDS.histoire,
    name: 'Histoire-Géographie',
    description: 'Cours de démonstration — histoire-géo',
    subjectId: DEV_SUBJECT_IDS.sciencesHumaines,
  },
];

type DevTopic = { id: string; name: string; description: string; courseId: string };

export const DEV_TOPICS: DevTopic[] = [
  { id: DEV_TOPIC_IDS.trigonometrie, name: 'Trigonométrie', description: '', courseId: DEV_COURSE_IDS.maths },
  { id: DEV_TOPIC_IDS.pythagore, name: 'Théorème de Pythagore', description: '', courseId: DEV_COURSE_IDS.maths },
  { id: DEV_TOPIC_IDS.algebre, name: 'Algèbre', description: '', courseId: DEV_COURSE_IDS.maths },
  { id: DEV_TOPIC_IDS.physique, name: 'Physique', description: '', courseId: DEV_COURSE_IDS.sciences },
  { id: DEV_TOPIC_IDS.biologie, name: 'Biologie', description: '', courseId: DEV_COURSE_IDS.sciences },
  { id: DEV_TOPIC_IDS.grammaire, name: 'Grammaire', description: '', courseId: DEV_COURSE_IDS.francais },
  { id: DEV_TOPIC_IDS.conjugaison, name: 'Conjugaison', description: '', courseId: DEV_COURSE_IDS.francais },
  { id: DEV_TOPIC_IDS.prehistoire, name: 'Préhistoire', description: '', courseId: DEV_COURSE_IDS.histoire },
  { id: DEV_TOPIC_IDS.antiquite, name: 'Antiquité', description: '', courseId: DEV_COURSE_IDS.histoire },
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

const TEACHER_SPECIALTY_COURSE: Record<string, string> = {
  '55555555-5555-5555-5555-000000000001': DEV_COURSE_IDS.maths,
  '55555555-5555-5555-5555-000000000002': DEV_COURSE_IDS.sciences,
  '55555555-5555-5555-5555-000000000003': DEV_COURSE_IDS.francais,
  '55555555-5555-5555-5555-000000000004': DEV_COURSE_IDS.histoire,
};

/** Matières qu'un prof peut noter dans une classe (affectation class-service). */
export function courseIdsForTeacherInClass(teacherId: string, classId: string): string[] {
  if (!teacherIdsForClass(classId).includes(teacherId)) {
    return [];
  }
  if (teacherId === DEV_USER_IDS.teacher) {
    return DEV_COURSES.map((course) => course.id);
  }
  const specialty = TEACHER_SPECIALTY_COURSE[teacherId];
  return specialty ? [specialty] : [];
}

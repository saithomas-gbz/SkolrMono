import realDb, { testDatabaseConnection } from '../../shared/db';

/**
 * Vue Prisma propre au module grade.
 *
 * Le module grade conserve des copies locales de User/Class/Course (modèles
 * historiques du service). Dans le schéma consolidé, ces modèles ont été renommés
 * `GradeUser`/`GradeClass`/`GradeCourse` pour éviter les collisions avec auth/class.
 * Ce proxy réexpose les anciens accesseurs (`db.user`, `db.class`, `db.course`)
 * vers les nouveaux délégués, ce qui évite de toucher les controllers et les tests.
 */
const aliases: Record<string, string> = {
  user: 'gradeUser',
  class: 'gradeClass',
  course: 'gradeCourse',
};

const gradeDb = new Proxy(realDb, {
  get(target, prop, receiver) {
    if (typeof prop === 'string' && prop in aliases) {
      return Reflect.get(target, aliases[prop]!, receiver);
    }
    return Reflect.get(target, prop, receiver);
  },
});

type GradeDb = typeof realDb & {
  user: typeof realDb.gradeUser;
  class: typeof realDb.gradeClass;
  course: typeof realDb.gradeCourse;
};

export { testDatabaseConnection };
export default gradeDb as unknown as GradeDb;

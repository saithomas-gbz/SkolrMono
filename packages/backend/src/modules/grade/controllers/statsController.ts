import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import { weightedAverage, median, rankOf, gradeDistributionBuckets } from '../lib/stats';
import { getClassIdsForTeacher, teacherTeachesCourse } from '../lib/classServiceClient';
import { getOrCompute } from '../lib/ttlCache';

type GradeStatus = 'PENDING' | 'GRADED' | 'ABSENT' | 'EXEMPT';

const STATS_TTL_MS = 30_000;

interface WeightedEntry {
  value: number | null;
  coefficient: number;
  status: GradeStatus;
}

interface CourseGroup {
  courseId: string;
  courseName: string;
  subjectName: string | null;
  entries: WeightedEntry[];
}

function groupByCourse(
  grades: { courseId: string; value: number | null; status: GradeStatus; assignment: { coefficient: number }; course: { name: string; subject: { name: string } | null } }[],
): Map<string, CourseGroup> {
  const map = new Map<string, CourseGroup>();
  for (const g of grades) {
    let group = map.get(g.courseId);
    if (!group) {
      group = { courseId: g.courseId, courseName: g.course.name, subjectName: g.course.subject?.name ?? null, entries: [] };
      map.set(g.courseId, group);
    }
    group.entries.push({ value: g.value, coefficient: g.assignment.coefficient, status: g.status });
  }
  return map;
}

export default {
  getClassStats: async (
    request: FastifyRequest<{ Params: { classId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { classId } = request.params;
      const gradeUser = request.gradeUser!;

      if (gradeUser.role === 'TEACHER') {
        const teacherClassIds = await getClassIdsForTeacher(gradeUser.userId);
        if (!teacherClassIds.includes(classId)) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      }

      const data = await getOrCompute(`class:${classId}`, STATS_TTL_MS, async () => {
        const grades = await db.grade.findMany({
          where: { classId },
          include: { assignment: true, course: { include: { subject: true } } },
        });

        const groups = [...groupByCourse(grades).values()];
        const byCourse = groups.map((group) => ({
          courseId: group.courseId,
          courseName: group.courseName,
          subjectName: group.subjectName,
          average: weightedAverage(group.entries),
          gradedCount: group.entries.filter((e) => e.status === 'GRADED' && e.value !== null).length,
        }));

        const allEntries = groups.flatMap((g) => g.entries);
        const average = weightedAverage(allEntries);
        const gradedValues = allEntries.filter((e) => e.status === 'GRADED' && e.value !== null).map((e) => e.value!);

        return {
          classId,
          average,
          byCourse,
          distribution: gradeDistributionBuckets(gradedValues),
        };
      });

      return reply.status(200).send({ data, message: 'Class stats fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getUserStats: async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { userId } = request.params;

      const data = await getOrCompute(`user:${userId}`, STATS_TTL_MS, async () => {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) return null;

        const grades = await db.grade.findMany({
          where: { userId },
          include: { assignment: true, course: { include: { subject: true } } },
          orderBy: { assignment: { assignedAt: 'asc' } },
        });

        const groups = [...groupByCourse(grades).values()];
        const byCourse = groups.map((group) => ({
          courseId: group.courseId,
          courseName: group.courseName,
          subjectName: group.subjectName,
          average: weightedAverage(group.entries),
        }));

        const average = weightedAverage(groups.flatMap((g) => g.entries));

        // Évolution de la moyenne pondérée cumulative, dans l'ordre chronologique des devoirs notés.
        const trend: { date: string; average: number }[] = [];
        const seen: WeightedEntry[] = [];
        for (const g of grades) {
          if (g.status !== 'GRADED' || g.value === null) continue;
          seen.push({ value: g.value, coefficient: g.assignment.coefficient, status: g.status });
          const runningAverage = weightedAverage(seen);
          if (runningAverage !== null) {
            trend.push({ date: g.assignment.assignedAt.toISOString(), average: runningAverage });
          }
        }

        // Rang dans la classe : moyenne globale de chaque élève du roster.
        const classmateGrades = await db.grade.findMany({
          where: { classId: user.classId },
          include: { assignment: true },
        });
        const byUser = new Map<string, WeightedEntry[]>();
        for (const g of classmateGrades) {
          const entries = byUser.get(g.userId) ?? [];
          entries.push({ value: g.value, coefficient: g.assignment.coefficient, status: g.status });
          byUser.set(g.userId, entries);
        }
        const classmateAverages = [...byUser.entries()]
          .map(([id, entries]) => ({ id, average: weightedAverage(entries) }))
          .filter((a): a is { id: string; average: number } => a.average !== null);
        const rank = rankOf(classmateAverages, userId);

        return { userId, average, byCourse, trend, rank };
      });

      if (!data) return reply.status(404).send({ error: 'User not found' });

      return reply.status(200).send({ data, message: 'User stats fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getAssignmentStats: async (
    request: FastifyRequest<{ Params: { assignmentId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { assignmentId } = request.params;
      const gradeUser = request.gradeUser!;

      const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
      if (!assignment) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }

      if (gradeUser.role === 'TEACHER') {
        const allowed = await teacherTeachesCourse(assignment.classId, gradeUser.userId, assignment.courseId);
        if (!allowed) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
      }

      const data = await getOrCompute(`assignment:${assignmentId}`, STATS_TTL_MS, async () => {
        const [totalCount, gradedRows] = await Promise.all([
          db.grade.count({ where: { assignmentId } }),
          db.grade.findMany({ where: { assignmentId, status: 'GRADED' } }),
        ]);

        const values = gradedRows.map((g) => g.value).filter((v): v is number => v !== null);
        const gradedCount = values.length;
        const average = gradedCount === 0 ? null : values.reduce((acc, v) => acc + v, 0) / gradedCount;

        return {
          assignmentId,
          gradedCount,
          totalCount,
          min: gradedCount === 0 ? null : Math.min(...values),
          max: gradedCount === 0 ? null : Math.max(...values),
          average,
          median: median(values),
        };
      });

      return reply.status(200).send({ data, message: 'Assignment stats fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};

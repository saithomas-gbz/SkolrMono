import type { FastifyRequest, FastifyReply } from 'fastify';
import PDFDocument from 'pdfkit';
import db from '../db';
import { weightedAverage } from '../lib/stats';

type GradeStatus = 'PENDING' | 'GRADED' | 'ABSENT' | 'EXEMPT';

interface CourseGroup {
  courseName: string;
  subjectName: string | null;
  entries: {
    title: string;
    date: Date;
    value: number | null;
    maxScore: number;
    coefficient: number;
    status: GradeStatus;
  }[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatGrade(value: number | null, maxScore: number, status: GradeStatus): string {
  if (status === 'ABSENT') return 'Absent';
  if (status === 'EXEMPT') return 'Dispensé';
  if (status === 'PENDING' || value === null) return '—';
  return `${Math.round(value * 10) / 10}/${maxScore}`;
}

function generatePdf(
  studentName: string,
  className: string,
  courseGroups: CourseGroup[],
  generatedAt: Date,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = '#1a56db';
    const lightGray = '#f3f4f6';
    const darkGray = '#374151';
    const pageWidth = doc.page.width - 100;

    // --- Header ---
    doc.rect(0, 0, doc.page.width, 90).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('Skolr', 50, 25);
    doc.fontSize(11).font('Helvetica').text('Plateforme de gestion scolaire', 50, 52);
    doc.fontSize(18).font('Helvetica-Bold').text('Bulletin de Notes', 0, 30, { align: 'right' });
    doc.fillColor(darkGray).moveDown(2);

    // --- Student info block ---
    const infoTop = 110;
    doc.rect(50, infoTop, pageWidth, 58).fill(lightGray).stroke('#e5e7eb');
    doc.fillColor(darkGray).fontSize(11).font('Helvetica-Bold');
    doc.text('Élève :', 66, infoTop + 10);
    doc.text('Classe :', 66, infoTop + 28);
    doc.text('Date d\'édition :', 66, infoTop + 46);
    doc.font('Helvetica');
    doc.text(studentName, 150, infoTop + 10);
    doc.text(className, 150, infoTop + 28);
    doc.text(formatDate(generatedAt), 150, infoTop + 46);

    doc.y = infoTop + 75;

    // --- Course sections ---
    for (const group of courseGroups) {
      const sectionLabel = group.subjectName
        ? `${group.courseName} — ${group.subjectName}`
        : group.courseName;

      if (doc.y > doc.page.height - 180) doc.addPage();

      // Course header bar
      doc.rect(50, doc.y, pageWidth, 22).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text(sectionLabel, 58, doc.y - 18);
      doc.y += 8;

      // Column headers
      const colY = doc.y;
      doc.rect(50, colY, pageWidth, 18).fill('#dbeafe').stroke('#bfdbfe');
      doc.fillColor(darkGray).fontSize(9).font('Helvetica-Bold');
      doc.text('Devoir', 58, colY + 4);
      doc.text('Date', 280, colY + 4);
      doc.text('Coeff.', 350, colY + 4);
      doc.text('Note', 410, colY + 4);
      doc.y = colY + 18;

      // Grade rows
      let rowIndex = 0;
      for (const entry of group.entries) {
        if (doc.y > doc.page.height - 60) doc.addPage();
        const rowY = doc.y;
        const rowBg = rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(50, rowY, pageWidth, 16).fill(rowBg);
        doc.fillColor(darkGray).fontSize(9).font('Helvetica');
        doc.text(entry.title, 58, rowY + 3, { width: 210, ellipsis: true });
        doc.text(formatDate(entry.date), 280, rowY + 3);
        doc.text(String(entry.coefficient), 350, rowY + 3);
        doc.text(formatGrade(entry.value, entry.maxScore, entry.status), 410, rowY + 3);
        doc.y = rowY + 16;
        rowIndex++;
      }

      // Course average row
      const avg = weightedAverage(group.entries);
      const avgText = avg !== null ? `${Math.round(avg * 10) / 10}/20` : 'Pas encore de moyenne';
      const avgY = doc.y;
      doc.rect(50, avgY, pageWidth, 18).fill('#eff6ff').stroke('#bfdbfe');
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
      doc.text('Moyenne de la matière :', 58, avgY + 4);
      doc.text(avgText, 410, avgY + 4);
      doc.y = avgY + 26;
    }

    // --- Global average ---
    if (doc.y > doc.page.height - 80) doc.addPage();
    const allEntries = courseGroups.flatMap((g) => g.entries);
    const globalAvg = weightedAverage(allEntries);
    const globalText =
      globalAvg !== null ? `${Math.round(globalAvg * 10) / 10}/20` : 'Pas encore de moyenne';

    doc.moveDown(0.5);
    const globalY = doc.y;
    doc.rect(50, globalY, pageWidth, 28).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
    doc.text('Moyenne générale :', 58, globalY + 7);
    doc.text(globalText, 410, globalY + 7);
    doc.y = globalY + 38;

    // --- Footer ---
    doc.fontSize(8).font('Helvetica').fillColor('#9ca3af');
    doc.text(`Bulletin généré le ${formatDate(generatedAt)} par Skolr`, 50, doc.page.height - 40, {
      align: 'center',
      width: pageWidth,
    });

    doc.end();
  });
}

export default {
  getBulletinPdf: async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { userId } = request.params;

      const user = await db.user.findUnique({
        where: { id: userId },
        include: { class: true },
      });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const grades = await db.grade.findMany({
        where: { userId },
        include: {
          assignment: true,
          course: { include: { subject: true } },
        },
        orderBy: { assignment: { assignedAt: 'asc' } },
      });

      // Group by course
      const courseMap = new Map<string, CourseGroup>();
      for (const g of grades) {
        let group = courseMap.get(g.courseId);
        if (!group) {
          group = {
            courseName: g.course.name,
            subjectName: g.course.subject?.name ?? null,
            entries: [],
          };
          courseMap.set(g.courseId, group);
        }
        group.entries.push({
          title: g.assignment.title,
          date: g.assignment.assignedAt,
          value: g.value,
          maxScore: g.assignment.maxScore,
          coefficient: g.assignment.coefficient,
          status: g.status as GradeStatus,
        });
      }

      const courseGroups = [...courseMap.values()].sort((a, b) =>
        a.courseName.localeCompare(b.courseName),
      );

      const pdfBuffer = await generatePdf(
        user.name,
        user.class?.name ?? 'Classe inconnue',
        courseGroups,
        new Date(),
      );

      const safeFilename = `bulletin-${user.name.replace(/[^a-zA-Z0-9À-ɏ]/g, '-')}.pdf`;
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${safeFilename}"`)
        .send(pdfBuffer);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};

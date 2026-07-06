const statsTag = 'stats';

const errorBody = {
  type: 'object',
  properties: { error: { type: 'string' } },
  required: ['error'],
} as const;

const courseAverage = {
  type: 'object',
  properties: {
    courseId: { type: 'string' },
    courseName: { type: 'string' },
    subjectName: { type: 'string', nullable: true },
    average: { type: 'number', nullable: true },
  },
  required: ['courseId', 'courseName', 'subjectName', 'average'],
} as const;

const courseAverageWithCount = {
  type: 'object',
  properties: {
    courseId: { type: 'string' },
    courseName: { type: 'string' },
    subjectName: { type: 'string', nullable: true },
    average: { type: 'number', nullable: true },
    gradedCount: { type: 'number' },
  },
  required: ['courseId', 'courseName', 'subjectName', 'average', 'gradedCount'],
} as const;

const distributionBucket = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    min: { type: 'number' },
    max: { type: 'number' },
    count: { type: 'number' },
  },
  required: ['label', 'min', 'max', 'count'],
} as const;

const rank = {
  type: 'object',
  properties: {
    position: { type: 'number' },
    totalStudents: { type: 'number' },
  },
  required: ['position', 'totalStudents'],
  nullable: true,
} as const;

const trendPoint = {
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date-time' },
    average: { type: 'number' },
  },
  required: ['date', 'average'],
} as const;

const classStats = {
  type: 'object',
  properties: {
    classId: { type: 'string' },
    average: { type: 'number', nullable: true },
    byCourse: { type: 'array', items: courseAverageWithCount },
    distribution: { type: 'array', items: distributionBucket },
  },
  required: ['classId', 'average', 'byCourse', 'distribution'],
} as const;

const userStats = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    average: { type: 'number', nullable: true },
    byCourse: { type: 'array', items: courseAverage },
    trend: { type: 'array', items: trendPoint },
    rank,
  },
  required: ['userId', 'average', 'byCourse', 'trend', 'rank'],
} as const;

const assignmentStats = {
  type: 'object',
  properties: {
    assignmentId: { type: 'string' },
    gradedCount: { type: 'number' },
    totalCount: { type: 'number' },
    min: { type: 'number', nullable: true },
    max: { type: 'number', nullable: true },
    average: { type: 'number', nullable: true },
    median: { type: 'number', nullable: true },
  },
  required: ['assignmentId', 'gradedCount', 'totalCount', 'min', 'max', 'average', 'median'],
} as const;

export const getClassStatsSchema = {
  description: 'Get grade statistics for a class (average by course, distribution)',
  tags: [statsTag],
  params: {
    type: 'object',
    properties: { classId: { type: 'string' } },
    required: ['classId'],
  },
  response: {
    200: { type: 'object', properties: { data: classStats, message: { type: 'string' } }, required: ['data', 'message'] },
    401: errorBody,
    403: errorBody,
    500: errorBody,
  },
} as const;

export const getUserStatsSchema = {
  description: 'Get grade statistics for a user (average, trend over time, rank in class)',
  tags: [statsTag],
  params: {
    type: 'object',
    properties: { userId: { type: 'string' } },
    required: ['userId'],
  },
  response: {
    200: { type: 'object', properties: { data: userStats, message: { type: 'string' } }, required: ['data', 'message'] },
    401: errorBody,
    403: errorBody,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const getAssignmentStatsSchema = {
  description: 'Get grade statistics for an assignment (min, max, average, median)',
  tags: [statsTag],
  params: {
    type: 'object',
    properties: { assignmentId: { type: 'string' } },
    required: ['assignmentId'],
  },
  response: {
    200: { type: 'object', properties: { data: assignmentStats, message: { type: 'string' } }, required: ['data', 'message'] },
    401: errorBody,
    403: errorBody,
    500: errorBody,
  },
} as const;

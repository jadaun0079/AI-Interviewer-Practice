import { Schema, model, type Types } from 'mongoose';

/* ---------------- users ---------------- */
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: 'STUDENT' | 'ADMIN';
  plan: 'FREE' | 'PRO';
  college?: string;
  targetRole?: string;
  failedAttempts: number;
  lockedUntil?: Date | null;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' },
    plan: { type: String, enum: ['FREE', 'PRO'], default: 'FREE' },
    college: String,
    targetRole: String,
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);
export const User = model<IUser>('User', userSchema);

/* ---------------- refresh tokens ---------------- */
export interface IRefreshToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  userAgent?: string;
  expiresAt: Date;
  revokedAt?: Date | null;
}
const refreshSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: String,
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
refreshSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB deletes expired tokens itself
export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshSchema);

/* ---------------- resumes ---------------- */
export interface IResume {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fileName: string;
  text: string;
  characters: number;
  createdAt: Date;
}
const resumeSchema = new Schema<IResume>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    text: { type: String, required: true },
    characters: { type: Number, required: true },
  },
  { timestamps: true },
);
export const Resume = model<IResume>('Resume', resumeSchema);

/* ---------------- interviews (answers are embedded) ---------------- */
export interface IQuestion { index: number; q: string; topic: string; ref?: string }
export interface IEvaluation { score: number; strengths: string; improve: string; ideal: string }
export interface IAnswer { index: number; answer: string; score: number; evaluation: IEvaluation }
export interface IInterview {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  resumeId?: Types.ObjectId;
  role: string;
  difficulty: string;
  type: string;
  language: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  summary: string;
  skills: string[];
  questions: IQuestion[];
  answers: IAnswer[];
  report?: Record<string, any> | null;
  overallScore?: number | null;
  completedAt?: Date;
  createdAt: Date;
}

const questionSchema = new Schema<IQuestion>({ index: Number, q: String, topic: String, ref: String }, { _id: false });
const evaluationSchema = new Schema<IEvaluation>({ score: Number, strengths: String, improve: String, ideal: String }, { _id: false });
const answerSchema = new Schema<IAnswer>({ index: Number, answer: String, score: Number, evaluation: evaluationSchema }, { _id: false });

const interviewSchema = new Schema<IInterview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume' },
    role: { type: String, required: true },
    difficulty: { type: String, required: true },
    type: { type: String, required: true },
    language: { type: String, default: 'en-IN' },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'IN_PROGRESS' },
    summary: { type: String, default: '' },
    skills: { type: [String], default: [] },
    questions: { type: [questionSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    report: { type: Schema.Types.Mixed, default: null },
    overallScore: { type: Number, default: null },
    completedAt: Date,
  },
  { timestamps: true },
);
interviewSchema.index({ userId: 1, createdAt: -1 });
export const Interview = model<IInterview>('Interview', interviewSchema);

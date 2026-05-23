export type Role = "student" | "teacher" | "superadmin";
export type EducationalStage = "primary_4" | "primary_5" | "primary_6" | "prep_1" | "prep_2" | "prep_3" | "sec_1" | "sec_2" | "sec_3";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  age?: number;
  educationalStage?: string;
}

export interface User extends UserSession {
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseCard {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  educationalStage: string;
  teacher: { id: string; name: string };
  _count?: { accessCodes: number };
}

export interface CourseWithFolders {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  educationalStage: string;
  teacher: { id: string; name: string };
  folders: FolderWithContent[];
}

export interface FolderWithContent {
  id: string;
  name: string;
  order: number;
  videos: VideoItem[];
  quizzes: QuizItem[];
}

export interface VideoItem {
  id: string;
  title: string;
  bunnyId: string;
  order: number;
}

export interface QuizItem {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  order: number;
}

export const EDUCATIONAL_STAGES = [
  { value: "primary_4", label: "الصف الرابع الابتدائي" },
  { value: "primary_5", label: "الصف الخامس الابتدائي" },
  { value: "primary_6", label: "الصف السادس الابتدائي" },
  { value: "prep_1", label: "الصف الأول الإعدادي" },
  { value: "prep_2", label: "الصف الثاني الإعدادي" },
  { value: "prep_3", label: "الصف الثالث الإعدادي" },
  { value: "sec_1", label: "الصف الأول الثانوي" },
  { value: "sec_2", label: "الصف الثاني الثانوي" },
  { value: "sec_3", label: "الصف الثالث الثانوي" },
];

export const SUBJECTS = [
  "رياضيات",
  "فيزياء",
  "كيمياء",
  "أحياء",
  "لغة عربية",
  "لغة إنجليزية",
  "تاريخ",
  "جغرافيا",
  "علوم",
  "دراسات اجتماعية",
  "لغة فرنسية",
  "فلسفة ومنطق",
];

// ========= AI STUDY ASSISTANT TYPES =========
export interface StudyPlanItem {
  topic: string;
  duration: number; // minutes
  type: "video" | "quiz" | "reading";
  courseId?: string;
  priority: "high" | "medium" | "low";
}

export interface DailyStudyPlan {
  id: string;
  studentId: string;
  planDate: Date;
  content: StudyPlanItem[];
  status: "pending" | "in_progress" | "completed";
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ========= ADMIN DASHBOARD TYPES =========
export interface TeacherStats {
  totalStudents: number;
  totalEnrollments: number;
  totalVideosViewed: number;
  averageQuizScore: number;
  courseStats: CourseStatItem[];
}

export interface CourseStatItem {
  courseId: string;
  courseName: string;
  enrollments: number;
  videosViewed: number;
  averageScore: number;
}

export interface StudentProgress {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  videosWatched: number;
  totalVideos: number;
  averageQuizScore: number;
  lastActivityAt: Date;
}

export interface AccessCodeData {
  id: string;
  code: string;
  courseId: string;
  courseName: string;
  studentId?: string;
  studentName?: string;
  isActive: boolean;
  usedAt?: Date;
  createdAt: Date;
}

// ========= AI API TYPES =========
export interface AIApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AIFallbackConfig {
  primary: {
    apiKey: string;
    baseUrl: string;
    timeout: number;
  };
  backup: {
    apiKey: string;
    baseUrl: string;
    timeout: number;
  };
}

// ========= ANIMATION TYPES =========
export interface AnimationVariants {
  hidden: Record<string, unknown>;
  visible: Record<string, unknown>;
  exit?: Record<string, unknown>;
}

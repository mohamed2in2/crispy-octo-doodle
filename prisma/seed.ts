import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

type SeedCourseInput = {
  title: string;
  subject: string;
  description: string;
  educationalStage: string;
  thumbnailUrl: string;
  folders: Array<{
    name: string;
    videos: Array<{ title: string; bunnyId: string }>;
    quizzes: Array<{
      title: string;
      questions: Array<{
        question: string;
        optionA: string;
        optionB: string;
        optionC: string;
        optionD: string;
        correctAnswer: "A" | "B" | "C" | "D";
      }>;
    }>;
  }>;
};

async function saveCourse(teacherId: string, courseInput: SeedCourseInput) {
  const existing = await prisma.course.findFirst({
    where: {
      teacherId,
      title: courseInput.title,
    },
    select: { id: true },
  });

  const payload = {
    title: courseInput.title,
    subject: courseInput.subject,
    description: courseInput.description,
    educationalStage: courseInput.educationalStage,
    thumbnailUrl: courseInput.thumbnailUrl,
    folders: {
      create: courseInput.folders.map((folder, folderIndex) => ({
        name: folder.name,
        order: folderIndex,
        videos: {
          create: folder.videos.map((video, videoIndex) => ({
            title: video.title,
            bunnyId: video.bunnyId,
            order: videoIndex,
          })),
        },
        quizzes: {
          create: folder.quizzes.map((quiz) => ({
            title: quiz.title,
            questions: {
              create: quiz.questions.map((question, questionIndex) => ({
                ...question,
                order: questionIndex,
              })),
            },
          })),
        },
      })),
    },
  };

  if (existing) {
    return prisma.course.update({
      where: { id: existing.id },
      data: {
        ...payload,
        folders: {
          deleteMany: {},
          create: payload.folders.create,
        },
      },
    });
  }

  return prisma.course.create({
    data: {
      ...payload,
      teacherId,
    },
  });
}

async function main() {
  const teacherPassword = await bcrypt.hash("teacher123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);

  const teacher = await prisma.user.upsert({
    where: { email: "teacher.demo@platform.local" },
    update: {
      name: "مستر أحمد",
      password: teacherPassword,
      role: "teacher",
      educationalStage: "prep_3",
    },
    create: {
      name: "مستر أحمد",
      email: "teacher.demo@platform.local",
      password: teacherPassword,
      role: "teacher",
      educationalStage: "prep_3",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student.demo@platform.local" },
    update: {
      name: "طالب تجريبي",
      password: studentPassword,
      role: "student",
      educationalStage: "prep_3",
    },
    create: {
      name: "طالب تجريبي",
      email: "student.demo@platform.local",
      password: studentPassword,
      role: "student",
      educationalStage: "prep_3",
    },
  });

  const mathCourse = await saveCourse(teacher.id, {
    title: "تأسيس الجبر للصف الثالث الإعدادي",
    subject: "رياضيات",
    description: "شرح مبسط خطوة بخطوة للجبر مع تدريبات واختبارات قصيرة.",
    educationalStage: "prep_3",
    thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&q=80",
    folders: [
      {
        name: "المحاضرة 1: الحدود الجبرية",
        videos: [
          { title: "مقدمة الحدود الجبرية", bunnyId: "demo-math-v1" },
          { title: "عمليات على الحدود الجبرية", bunnyId: "demo-math-v2" },
        ],
        quizzes: [
          {
            title: "اختبار سريع: الحدود الجبرية",
            questions: [
              {
                question: "ناتج 3س + 5س يساوي؟",
                optionA: "8س",
                optionB: "15س",
                optionC: "3س5",
                optionD: "س^8",
                correctAnswer: "A",
              },
              {
                question: "أي تعبير يمثل حدًا جبريًا أحاديًا؟",
                optionA: "س + 2",
                optionB: "4س",
                optionC: "س/ص + 1",
                optionD: "2 + 3",
                correctAnswer: "B",
              },
            ],
          },
        ],
      },
      {
        name: "المحاضرة 2: تحليل المقدار",
        videos: [
          { title: "مقدمة في التحليل", bunnyId: "demo-math-v3" },
        ],
        quizzes: [
          {
            title: "اختبار: التحليل",
            questions: [
              {
                question: "تحليل س^2 - 9 هو؟",
                optionA: "(س-9)(س+1)",
                optionB: "(س-3)(س+3)",
                optionC: "(س-1)(س+9)",
                optionD: "لا يمكن تحليله",
                correctAnswer: "B",
              },
            ],
          },
        ],
      },
    ],
  });

  const physicsCourse = await saveCourse(teacher.id, {
    title: "فيزياء الحركة للمبتدئين",
    subject: "فيزياء",
    description: "أساسيات الحركة والسرعة والتسارع مع مسائل محلولة.",
    educationalStage: "sec_1",
    thumbnailUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80",
    folders: [
      {
        name: "المحاضرة 1: مفاهيم أساسية",
        videos: [
          { title: "المسافة والإزاحة", bunnyId: "demo-physics-v1" },
          { title: "السرعة المتوسطة", bunnyId: "demo-physics-v2" },
        ],
        quizzes: [
          {
            title: "اختبار مفاهيم الحركة",
            questions: [
              {
                question: "وحدة قياس السرعة هي؟",
                optionA: "متر",
                optionB: "متر/ثانية",
                optionC: "ثانية",
                optionD: "نيوتن",
                correctAnswer: "B",
              },
            ],
          },
        ],
      },
    ],
  });

  await prisma.accessCode.upsert({
    where: { code: "MATH2026" },
    update: {
      courseId: mathCourse.id,
      studentId: student.id,
      usedAt: new Date(),
      isActive: true,
    },
    create: {
      code: "MATH2026",
      courseId: mathCourse.id,
      studentId: student.id,
      usedAt: new Date(),
      isActive: true,
    },
  });

  await prisma.accessCode.upsert({
    where: { code: "PHYX2026" },
    update: {
      courseId: physicsCourse.id,
      studentId: null,
      usedAt: null,
      isActive: true,
    },
    create: {
      code: "PHYX2026",
      courseId: physicsCourse.id,
      isActive: true,
    },
  });

  console.log("Seed complete:");
  console.log("Teacher login: teacher.demo@platform.local / teacher123");
  console.log("Student login: student.demo@platform.local / student123");
  console.log("Access code for second course: PHYX2026");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

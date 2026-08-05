import { redirect } from "next/navigation";

import { ClassicShell } from "@/components/classic/ClassicShell";
import { IconUsers } from "@/components/classic/icons";
import { Badge, Band, Card, Empty, Section } from "@/components/classic/pieces";
import { getSession } from "@/lib/auth";
import { getWalletSummary } from "@/lib/financial/data";
import { piastresToPounds } from "@/lib/financial/money";
import { getNotifications } from "@/lib/notifications/data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type QuestionRow = {
  id: string;
  studentId: string;
  teacherId: string;
  title: string;
  body: string;
  createdAt: Date;
  studentName: string;
  teacherName: string;
  answerBody: string | null;
  answeredAt: Date | null;
};

function money(piastres: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(piastresToPounds(piastres))} جنيه`;
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?redirect_url=/community");

  const [notice, params] = await Promise.all([getNotifications(), searchParams]);
  const balance = session.role === "student" ? money((await getWalletSummary()).balancePiastres) : "حساب مدرس";

  const questions = session.role === "teacher"
    ? await prisma.$queryRaw<QuestionRow[]>`SELECT q.*, s.name AS "studentName", COALESCE(tp."displayName", t.name) AS "teacherName", a.body AS "answerBody", a."createdAt" AS "answeredAt" FROM "CommunityQuestion" q JOIN "User" s ON s.id=q."studentId" JOIN "User" t ON t.id=q."teacherId" LEFT JOIN "TeacherProfile" tp ON tp."teacherId"=t.id LEFT JOIN "CommunityAnswer" a ON a."questionId"=q.id WHERE q."teacherId"=${session.id} ORDER BY q."createdAt" DESC`
    : await prisma.$queryRaw<QuestionRow[]>`SELECT q.*, s.name AS "studentName", COALESCE(tp."displayName", t.name) AS "teacherName", a.body AS "answerBody", a."createdAt" AS "answeredAt" FROM "CommunityQuestion" q JOIN "User" s ON s.id=q."studentId" JOIN "User" t ON t.id=q."teacherId" LEFT JOIN "TeacherProfile" tp ON tp."teacherId"=t.id LEFT JOIN "CommunityAnswer" a ON a."questionId"=q.id WHERE q."studentId"=${session.id} ORDER BY q."createdAt" DESC`;

  const subscriptions = session.role === "student"
    ? await prisma.teacherSubscription.findMany({
        where: {
          studentId: session.id,
          status: "active",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { teacher: { select: { name: true, teacherProfile: { select: { displayName: true } } } } },
      })
    : [];

  return (
    <ClassicShell title="اسأل مدرسك" balanceLabel={balance} unreadCount={notice.unreadCount}>
      {params.error ? <Band tone="danger" text={params.error} /> : null}
      {params.success ? <Band tone="success" text={params.success} /> : null}

      {session.role === "student" ? (
        <Section title="انشر سؤالاً لمعلم مشترك معه">
          {subscriptions.length ? (
            <div className="c-tiles">
              {subscriptions.map((subscription) => (
                <Card key={subscription.id} title={subscription.teacher.teacherProfile?.displayName ?? subscription.teacher.name} icon={<IconUsers />}>
                  <form method="post" action="/api/community" className="c-stack">
                    <input type="hidden" name="teacherId" value={subscription.teacherId} />
                    <label className="c-field"><span>عنوان السؤال</span><input className="c-input" name="title" maxLength={140} required /></label>
                    <label className="c-field"><span>السؤال</span><textarea className="c-input" name="body" rows={5} maxLength={2000} required /></label>
                    <button className="c-btn c-btn--primary" type="submit">نشر السؤال للمدرس</button>
                  </form>
                </Card>
              ))}
            </div>
          ) : <Card><Empty icon={<IconUsers />} title="لا يوجد اشتراك مدرس فعال" text="اشترك مع مدرس أولاً حتى تتمكن من إرسال سؤال له." /></Card>}
        </Section>
      ) : null}

      <Section title={session.role === "teacher" ? "أسئلة الطلاب المشتركين" : "أسئلتي وردود المدرسين"}>
        {questions.length ? (
          <div className="c-stack">
            {questions.map((question) => (
              <Card
                key={question.id}
                title={question.title}
                description={`${session.role === "teacher" ? question.studentName : question.teacherName} · ${new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(question.createdAt)}`}
                icon={<IconUsers />}
                headerAction={<Badge label={question.answerBody ? "تم الرد" : "بانتظار الرد"} tone={question.answerBody ? "green" : "amber"} />}
              >
                <p className="c-copy">{question.body}</p>
                {question.answerBody ? <Band tone="success" title="رد المدرس" text={question.answerBody} /> : null}
                {!question.answerBody && session.role === "teacher" ? (
                  <form method="post" action={`/api/community/${question.id}/answer`} className="c-stack">
                    <label className="c-field"><span>ردك على الطالب</span><textarea className="c-input" name="body" rows={5} maxLength={3000} required /></label>
                    <button className="c-btn c-btn--primary" type="submit">حفظ الرد</button>
                  </form>
                ) : null}
              </Card>
            ))}
          </div>
        ) : <Card><Empty icon={<IconUsers />} title="لا توجد أسئلة حتى الآن" text={session.role === "teacher" ? "أسئلة الطلاب المشتركين ستظهر هنا." : "انشر أول سؤال من الأعلى."} /></Card>}
      </Section>
    </ClassicShell>
  );
}

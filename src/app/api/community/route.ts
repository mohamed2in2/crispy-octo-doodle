import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cleanBoundedText } from "@/lib/community-live";
import { prisma } from "@/lib/prisma";

type CommunityRow = { id:string; studentId:string; teacherId:string; title:string; body:string; createdAt:Date; studentName:string; teacherName:string; answerBody:string|null; answeredAt:Date|null };

async function readPayload(req: NextRequest) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return req.json() as Promise<Record<string, unknown>>;
  const form = await req.formData();
  return Object.fromEntries(form.entries());
}
function finish(req: NextRequest, ok: boolean, message?: string) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return NextResponse.json(ok ? { success:true } : { error:message }, { status:ok?201:400 });
  const url = new URL("/community", req.url); if (message) url.searchParams.set(ok?"success":"error", message);
  return NextResponse.redirect(url, 303);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error:"غير مصرح" }, { status:401 });
  const clause = session.role === "teacher" ? prisma.$queryRaw<CommunityRow[]>`
    SELECT q.*, s.name AS "studentName", COALESCE(tp."displayName", t.name) AS "teacherName", a.body AS "answerBody", a."createdAt" AS "answeredAt"
    FROM "CommunityQuestion" q JOIN "User" s ON s.id=q."studentId" JOIN "User" t ON t.id=q."teacherId"
    LEFT JOIN "TeacherProfile" tp ON tp."teacherId"=t.id LEFT JOIN "CommunityAnswer" a ON a."questionId"=q.id
    WHERE q."teacherId"=${session.id} ORDER BY q."createdAt" DESC`
    : prisma.$queryRaw<CommunityRow[]>`
    SELECT q.*, s.name AS "studentName", COALESCE(tp."displayName", t.name) AS "teacherName", a.body AS "answerBody", a."createdAt" AS "answeredAt"
    FROM "CommunityQuestion" q JOIN "User" s ON s.id=q."studentId" JOIN "User" t ON t.id=q."teacherId"
    LEFT JOIN "TeacherProfile" tp ON tp."teacherId"=t.id LEFT JOIN "CommunityAnswer" a ON a."questionId"=q.id
    WHERE q."studentId"=${session.id} ORDER BY q."createdAt" DESC`;
  return NextResponse.json({ questions: await clause });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "student") return finish(req,false,"الطلاب المسجلون فقط يمكنهم نشر سؤال");
  const data=await readPayload(req); const teacherId=cleanBoundedText(data.teacherId,64); const title=cleanBoundedText(data.title,140); const body=cleanBoundedText(data.body,2000);
  if (!teacherId || title.length<4 || body.length<10) return finish(req,false,"اكتب عنواناً واضحاً وسؤالاً من 10 أحرف على الأقل");
  const subscription=await prisma.teacherSubscription.findFirst({where:{studentId:session.id,teacherId,status:"active",OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},select:{id:true}});
  if(!subscription) return finish(req,false,"يجب أن يكون اشتراكك مع المدرس فعالاً");
  const recent=await prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS count FROM "CommunityQuestion" WHERE "studentId"=${session.id} AND "createdAt">NOW()-INTERVAL '10 minutes'`;
  if(Number(recent[0]?.count??0)>=3) return finish(req,false,"انتظر قليلاً قبل نشر سؤال جديد");
  await prisma.$executeRaw`INSERT INTO "CommunityQuestion" (id,"studentId","teacherId",title,body) VALUES (${randomUUID()},${session.id},${teacherId},${title},${body})`;
  return finish(req,true,"تم نشر سؤالك للمدرس");
}

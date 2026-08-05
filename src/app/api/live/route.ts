import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cleanBoundedText, isValidHttpUrl } from "@/lib/community-live";
import { prisma } from "@/lib/prisma";

type LiveRow={id:string;teacherId:string;title:string;joinUrl:string;startsAt:Date;endsAt:Date;teacherName:string};
export async function GET(){
 const session=await getSession(); if(!session)return NextResponse.json({error:"غير مصرح"},{status:401});
 if(session.role==="teacher") return NextResponse.json({sessions:await prisma.$queryRaw<LiveRow[]>`SELECT l.*,COALESCE(tp."displayName",u.name) AS "teacherName" FROM "TeacherLiveSession" l JOIN "User" u ON u.id=l."teacherId" LEFT JOIN "TeacherProfile" tp ON tp."teacherId"=u.id WHERE l."teacherId"=${session.id} ORDER BY l."startsAt" DESC`});
 const subs=await prisma.teacherSubscription.findMany({where:{studentId:session.id,status:"active",OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},select:{teacherId:true}}); const ids=subs.map(s=>s.teacherId);
 if(!ids.length)return NextResponse.json({sessions:[]});
 return NextResponse.json({sessions:await prisma.$queryRaw<LiveRow[]>`SELECT l.*,COALESCE(tp."displayName",u.name) AS "teacherName" FROM "TeacherLiveSession" l JOIN "User" u ON u.id=l."teacherId" LEFT JOIN "TeacherProfile" tp ON tp."teacherId"=u.id WHERE l."teacherId"=ANY(${ids}::text[]) ORDER BY l."startsAt" DESC`});
}
export async function POST(req:NextRequest){
 const session=await getSession(); if(!session||session.role!=="teacher")return NextResponse.redirect(new URL("/live?error="+encodeURIComponent("المدرسون فقط يمكنهم نشر بث"),req.url),303);
 const form=await req.formData();const title=cleanBoundedText(form.get("title"),140);const joinUrl=cleanBoundedText(form.get("joinUrl"),1000);const startsAt=new Date(String(form.get("startsAt")??""));const endsAt=new Date(String(form.get("endsAt")??""));
 if(title.length<3||!isValidHttpUrl(joinUrl)||Number.isNaN(startsAt.valueOf())||Number.isNaN(endsAt.valueOf())||endsAt<=startsAt)return NextResponse.redirect(new URL("/live?error="+encodeURIComponent("راجع العنوان والرابط وموعد البداية والنهاية"),req.url),303);
 await prisma.$executeRaw`INSERT INTO "TeacherLiveSession" (id,"teacherId",title,"joinUrl","startsAt","endsAt") VALUES (${randomUUID()},${session.id},${title},${joinUrl},${startsAt},${endsAt})`;
 return NextResponse.redirect(new URL("/live?success="+encodeURIComponent("تم نشر موعد البث للمشتركين"),req.url),303);
}

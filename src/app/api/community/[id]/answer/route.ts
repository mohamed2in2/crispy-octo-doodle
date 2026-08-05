import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cleanBoundedText } from "@/lib/community-live";
import { prisma } from "@/lib/prisma";

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const session=await getSession(); const {id}=await params;
 if(!session||session.role!=="teacher") return NextResponse.redirect(new URL("/community?error="+encodeURIComponent("المدرس صاحب السؤال فقط يمكنه الرد"),req.url),303);
 const form=await req.formData(); const body=cleanBoundedText(form.get("body"),3000);
 if(body.length<2) return NextResponse.redirect(new URL("/community?error="+encodeURIComponent("اكتب الرد أولاً"),req.url),303);
 const rows=await prisma.$queryRaw<Array<{teacherId:string}>>`SELECT "teacherId" FROM "CommunityQuestion" WHERE id=${id} LIMIT 1`;
 if(rows[0]?.teacherId!==session.id) return NextResponse.redirect(new URL("/community?error="+encodeURIComponent("لا يمكنك الرد على سؤال موجه لمدرس آخر"),req.url),303);
 await prisma.$executeRaw`INSERT INTO "CommunityAnswer" (id,"questionId","teacherId",body) VALUES (${randomUUID()},${id},${session.id},${body}) ON CONFLICT ("questionId") DO UPDATE SET body=EXCLUDED.body,"updatedAt"=CURRENT_TIMESTAMP WHERE "CommunityAnswer"."teacherId"=${session.id}`;
 return NextResponse.redirect(new URL("/community?success="+encodeURIComponent("تم حفظ ردك"),req.url),303);
}

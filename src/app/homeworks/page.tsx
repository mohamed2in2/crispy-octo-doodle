import { redirect } from "next/navigation";
import { ClassicShell } from "@/components/classic/ClassicShell";
import { Badge, Card, Empty, LinkButton, Section } from "@/components/classic/pieces";
import { IconReceipt } from "@/components/classic/icons";
import { getStudentSession } from "@/lib/auth";
import { getWalletSummary } from "@/lib/financial/data";
import { piastresToPounds } from "@/lib/financial/money";
import { getNotifications } from "@/lib/notifications/data";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
const C={title:"\u0627\u0644\u0648\u0627\u062c\u0628\u0627\u062a \u0648\u0627\u0644\u0646\u062a\u0627\u0626\u062c",available:"\u0627\u0644\u0648\u0627\u062c\u0628\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629",empty:"\u0645\u0641\u064a\u0634 \u0648\u0627\u062c\u0628\u0627\u062a \u062f\u0644\u0648\u0642\u062a\u064a",emptyText:"\u0644\u0645\u0627 \u0627\u0644\u0645\u062f\u0631\u0633 \u064a\u0646\u0634\u0631 \u0648\u0627\u062c\u0628 \u0644\u0643\u0648\u0631\u0633 \u0645\u0634\u062a\u0631\u0643 \u0641\u064a\u0647 \u0647\u064a\u0638\u0647\u0631 \u0647\u0646\u0627.",open:"\u0627\u0641\u062a\u062d \u0648\u0633\u0644\u0651\u0645",submitted:"\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",pending:"\u062a\u062d\u062a \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629"} as const;
function money(p:number){return `${new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(piastresToPounds(p))} \u062c\u0646\u064a\u0647`;}
export default async function HomeworkHub(){
 const s=await getStudentSession();if(!s)redirect("/login?redirect_url=/homeworks");
 const [wallet,notices,codes]=await Promise.all([getWalletSummary(),getNotifications(),prisma.accessCode.findMany({where:{studentId:s.id},select:{courseId:true}})]);
 const ids=Array.from(new Set(codes.map(x=>x.courseId)));
 const rows=ids.length?await prisma.homework.findMany({where:{isPublished:true,courseId:{in:ids}},orderBy:[{dueAt:"asc"},{createdAt:"desc"}],include:{teacher:{select:{name:true,teacherProfile:{select:{slug:true,displayName:true}}}},submissions:{where:{studentId:s.id},select:{status:true,score:true,totalQ:true,completedAt:true}}}}):[];
 return <ClassicShell title={C.title} balanceLabel={money(wallet.balancePiastres)} unreadCount={notices.unreadCount}><Section title={C.available}>{rows.length?<div className="c-tiles">{rows.map(h=>{const sub=h.submissions[0];const slug=h.teacher.teacherProfile?.slug;return <Card key={h.id} title={h.title} description={`${h.teacher.teacherProfile?.displayName??h.teacher.name}${h.dueAt?` · ${new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium"}).format(h.dueAt)}`:""}`} icon={<IconReceipt/>} footer={sub?<Badge label={sub.score!=null?`${Math.round(sub.score)}% · ${C.submitted}`:C.pending} tone={sub.status==="passed"?"green":sub.status==="failed"?"red":"amber"}/>:slug?<LinkButton href={`/homeworks/teacher/${slug}?search=${encodeURIComponent(h.title)}`} label={C.open} inline/>:undefined}/>;})}</div>:<Card><Empty icon={<IconReceipt/>} title={C.empty} text={C.emptyText} action={<LinkButton href="/courses" label="\u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a" inline/>}/></Card>}</Section></ClassicShell>;
}

import { redirect } from "next/navigation";
import { ClassicShell } from "@/components/classic/ClassicShell";
import { Badge, Card, Empty, LinkButton, Section } from "@/components/classic/pieces";
import { IconHelp, IconReceipt } from "@/components/classic/icons";
import { getStudentSession } from "@/lib/auth";
import { getWalletSummary } from "@/lib/financial/data";
import { piastresToPounds } from "@/lib/financial/money";
import { getNotifications } from "@/lib/notifications/data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const C={title:"\u0628\u0646\u0643 \u0627\u0644\u0623\u0633\u0626\u0644\u0629",available:"\u0627\u0644\u0627\u0645\u062a\u062d\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629",history:"\u0646\u062a\u0627\u0626\u062c\u0643",start:"\u0627\u0628\u062f\u0623 \u0627\u0644\u0627\u0645\u062a\u062d\u0627\u0646",done:"\u062a\u0645 \u0627\u0644\u062d\u0644",empty:"\u0645\u0641\u064a\u0634 \u0627\u0645\u062a\u062d\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629",emptyText:"\u0627\u0644\u0627\u0645\u062a\u062d\u0627\u0646\u0627\u062a \u0647\u062a\u0638\u0647\u0631 \u0647\u0646\u0627 \u0628\u0639\u062f \u0627\u0634\u062a\u0631\u0627\u0643\u0643 \u0641\u064a \u0643\u0648\u0631\u0633 \u0641\u064a\u0647 \u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a.",minute:"\u062f\u0642\u064a\u0642\u0629"} as const;
function money(p:number){return `${new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(piastresToPounds(p))} \u062c\u0646\u064a\u0647`;}
export default async function QuizBankPage(){
 const session=await getStudentSession(); if(!session) redirect("/login?redirect_url=/quizzes");
 const [wallet,notices,codes]=await Promise.all([getWalletSummary(),getNotifications(),prisma.accessCode.findMany({where:{studentId:session.id},select:{courseId:true}})]);
 const courseIds=Array.from(new Set(codes.map(x=>x.courseId)));
 const quizzes=courseIds.length?await prisma.quiz.findMany({where:{folder:{courseId:{in:courseIds}}},orderBy:{createdAt:"desc"},include:{folder:{select:{course:{select:{id:true,title:true,subject:true}}}},results:{where:{studentId:session.id},select:{score:true,totalQ:true,completedAt:true}}}}):[];
 const completed=quizzes.filter(q=>q.results.length);
 return <ClassicShell title={C.title} balanceLabel={money(wallet.balancePiastres)} unreadCount={notices.unreadCount}>
  <Section title={C.available}>{quizzes.length?<div className="c-tiles">{quizzes.map(q=>{const r=q.results[0];return <Card key={q.id} title={q.title} description={`${q.folder?.course.title??""} · ${q.timeLimitMinutes} ${C.minute}`} icon={<IconHelp/>} footer={r?<Badge label={`${Math.round(r.score)}% · ${C.done}`} tone={r.score>=50?"green":"amber"}/>:<LinkButton href={`/quizzes/${q.id}`} label={C.start} inline/>}/>;})}</div>:<Card><Empty icon={<IconHelp/>} title={C.empty} text={C.emptyText} action={<LinkButton href="/courses" label="\u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a" inline/>}/></Card>}</Section>
  {completed.length?<Section title={C.history}><Card>{completed.map(q=><div className="c-list__item" key={q.id}><IconReceipt/><div className="c-list__grow"><p className="c-list__title">{q.title}</p><p className="c-list__meta">{q.folder?.course.title}</p></div><Badge label={`${Math.round(q.results[0].score)}%`} tone={q.results[0].score>=50?"green":"amber"}/></div>)}</Card></Section>:null}
 </ClassicShell>;
}

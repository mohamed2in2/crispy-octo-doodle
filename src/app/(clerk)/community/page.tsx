import { redirect } from "next/navigation";
import { ClassicShell } from "@/components/classic/ClassicShell";
import { Card, Empty, LinkButton, Section } from "@/components/classic/pieces";
import { IconUsers } from "@/components/classic/icons";
import { getStudentSession } from "@/lib/auth";
import { getWalletSummary } from "@/lib/financial/data";
import { piastresToPounds } from "@/lib/financial/money";
import { getNotifications } from "@/lib/notifications/data";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
function money(p:number){return `${new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(piastresToPounds(p))} \u062c\u0646\u064a\u0647`;}
export default async function CommunityPage(){const s=await getStudentSession();if(!s)redirect("/login?redirect_url=/community");const [w,n,t]=await Promise.all([getWalletSummary(),getNotifications(),prisma.teacherProfile.findMany({where:{isPublished:true,teacher:{isDeleted:false}},select:{slug:true,displayName:true,teacher:{select:{name:true}}},orderBy:{slug:"asc"}})]);return <ClassicShell title="\u0645\u062c\u062a\u0645\u0639\u0627\u062a \u0627\u0644\u0645\u062f\u0631\u0633\u064a\u0646" balanceLabel={money(w.balancePiastres)} unreadCount={n.unreadCount}><Section title="\u0627\u062e\u062a\u0627\u0631 \u0645\u062f\u0631\u0633\u0643">{t.length?<div className="c-tiles">{t.map(x=><Card key={x.slug} title={x.displayName??x.teacher.name} icon={<IconUsers/>} footer={<LinkButton href={`/${x.slug}`} label="\u0635\u0641\u062d\u0629 \u0627\u0644\u0645\u062f\u0631\u0633" inline/>}/>)}</div>:<Card><Empty icon={<IconUsers/>} title="\u0645\u0641\u064a\u0634 \u0645\u062c\u062a\u0645\u0639\u0627\u062a \u0645\u062a\u0627\u062d\u0629" text="\u0645\u062c\u062a\u0645\u0639 \u0627\u0644\u0645\u062f\u0631\u0633 \u0647\u064a\u0638\u0647\u0631 \u0628\u0639\u062f \u0646\u0634\u0631 \u0635\u0641\u062d\u062a\u0647."/></Card>}</Section></ClassicShell>;}

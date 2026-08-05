import { redirect } from "next/navigation";
import { ClassicShell } from "@/components/classic/ClassicShell";
import { Card, Empty } from "@/components/classic/pieces";
import { IconPlay } from "@/components/classic/icons";
import { getStudentSession } from "@/lib/auth";
import { getWalletSummary } from "@/lib/financial/data";
import { piastresToPounds } from "@/lib/financial/money";
import { getNotifications } from "@/lib/notifications/data";
export const dynamic="force-dynamic";
function money(p:number){return `${new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(piastresToPounds(p))} \u062c\u0646\u064a\u0647`;}
export default async function LivePage(){const s=await getStudentSession();if(!s)redirect("/login?redirect_url=/live");const[w,n]=await Promise.all([getWalletSummary(),getNotifications()]);return <ClassicShell title="\u0645\u0631\u0643\u0632 \u0627\u0644\u0628\u062b \u0627\u0644\u0645\u0628\u0627\u0634\u0631" balanceLabel={money(w.balancePiastres)} unreadCount={n.unreadCount}><Card><Empty icon={<IconPlay/>} title="\u0645\u0641\u064a\u0634 \u0628\u062b \u0645\u062c\u062f\u0648\u0644 \u062f\u0644\u0648\u0642\u062a\u064a" text="\u0647\u0646\u0627 \u0647\u062a\u0644\u0627\u0642\u064a \u0627\u0644\u0628\u062b \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0648\u0627\u0644\u062d\u0635\u0635 \u0627\u0644\u0642\u0627\u062f\u0645\u0629 \u0644\u0645\u0627 \u0627\u0644\u0645\u062f\u0631\u0633 \u064a\u062c\u062f\u0648\u0644\u0647\u0627. \u0632\u0631 \u0627\u0644\u062f\u062e\u0648\u0644 \u0645\u0634 \u0647\u064a\u0638\u0647\u0631 \u063a\u064a\u0631 \u0644\u0645\u0627 \u064a\u0643\u0648\u0646 \u0641\u064a\u0647 \u0631\u0627\u0628\u0637 \u0635\u0627\u0644\u062d."/></Card></ClassicShell>;}

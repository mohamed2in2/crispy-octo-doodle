import { ClassicShell } from "@/components/classic/ClassicShell";
import { IconUsers } from "@/components/classic/icons";
import { Card, Empty } from "@/components/classic/pieces";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  return (
    <ClassicShell title="المنتدى" balanceLabel="0 جنيه">
      <Card>
        <Empty
          icon={<IconUsers />}
          title="المنتدى غير متاح حالياً"
          text="خدمة المنتدى والأسئلة مغلقة مؤقتاً للصيانة والتحديث."
        />
      </Card>
    </ClassicShell>
  );
}

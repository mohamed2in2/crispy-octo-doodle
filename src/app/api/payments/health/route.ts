import { NextResponse } from "next/server";

export async function GET() {
  const sha7nawyPublicKey = process.env.SHA7NAWY_PUBLIC_KEY;
  const shakeoutPublicKey = process.env.SHAKEOUT_PUBLIC_KEY;

  const health = {
    sha7nawy: {
      status: sha7nawyPublicKey ? "operational" : "degraded",
      message: sha7nawyPublicKey ? "جاهزة لاستقبال مدفوعات المحافظ الإلكترونية" : "مفتاح Sha7nawy غير مكتمل",
    },
    shakeout: {
      status: shakeoutPublicKey ? "operational" : "degraded",
      message: shakeoutPublicKey ? "جاهزة لاستقبال مدفوعات فوري كشك" : "مفتاح Shake-Out غير مكتمل",
    },
  };

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    gateways: health,
  });
}

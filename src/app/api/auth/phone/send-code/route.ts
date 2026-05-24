import { NextRequest, NextResponse } from "next/server";
import {
  createPhoneVerificationChallenge,
  setPhoneVerificationCookie,
} from "@/lib/auth";
import { normalizeEgyptPhone } from "@/lib/phone";
import {
  generateVerificationCode,
  isTwilioVerifyEnabled,
  sendVerificationSms,
} from "@/lib/twilio";

// Simple in-memory rate limiter (single-instance). For production use Redis or a shared store.
const rateMap = new Map<string, { count: number; firstTs: number; lastTs: number }>();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute between sends to same number
const MAX_PER_HOUR = 5;

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "رقم الطالب مطلوب" }, { status: 400 });
    }

    console.log("Send-code request body phone:", typeof phone, JSON.stringify(phone));
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeEgyptPhone(phone);
    } catch (e) {
      console.error("normalizeEgyptPhone failed for:", JSON.stringify(phone), e);
      throw e;
    }

    // rate limiting per phone
    const now = Date.now();
    const entry = rateMap.get(normalizedPhone) || { count: 0, firstTs: now, lastTs: 0 };
    // reset hourly window
    if (now - entry.firstTs > 60 * 60 * 1000) {
      entry.count = 0;
      entry.firstTs = now;
    }
    if (entry.lastTs && now - entry.lastTs < RATE_WINDOW_MS) {
      return NextResponse.json({ error: "يرجى الانتظار قبل طلب رمز جديد" }, { status: 429 });
    }
    if (entry.count >= MAX_PER_HOUR) {
      return NextResponse.json({ error: "تجاوزت الحد الأقصى لطلبات الرمز اليوم" }, { status: 429 });
    }

    const code = generateVerificationCode();
    const sendResult = await sendVerificationSms(normalizedPhone, code);
    const method = (sendResult as any)?.method || (isTwilioVerifyEnabled() ? "verify" : "sms");

    // update limiter only on success
    entry.count = entry.count + 1;
    entry.lastTs = now;
    rateMap.set(normalizedPhone, entry);

    // If DEV_SKIP_SMS returned the code, include it in response for dev convenience
    const responseBody: any = { success: true };
    responseBody.method = method;
    if (sendResult && (sendResult as any).dev && (sendResult as any).code) {
      responseBody.debugCode = (sendResult as any).code;
    }

    // create and set verification cookie (used for messaging flow). For Verify flow the cookie will still exist
    // but verification will be performed using Twilio Verify check in signup.
    const challenge = await createPhoneVerificationChallenge(normalizedPhone, code, method);
    await setPhoneVerificationCookie(challenge);

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Send phone verification code error:", (error as any)?.stack || String(error));
    const msg = (error && (error as any).message) || String(error);

    if (msg.includes("Twilio credentials missing") || msg.includes("Authentication Error")) {
      return NextResponse.json({ error: "خطأ في إعدادات Twilio (مصادقة). تحقق من مفاتيح API الخاصة بك" }, { status: 502 });
    }

    if (msg.includes("TWILIO_VERIFY_SERVICE_SID")) {
      return NextResponse.json({ error: "خدمة التحقق (Verify) غير مفعلة أو SID مفقود" }, { status: 500 });
    }

    if (msg.includes("Twilio") && /30\d|40\d|50\d/.test(msg)) {
      return NextResponse.json({ error: "مزود الرسائل رفض الطلب. تحقق من رقم المرسل أو بيانات الاعتماد" }, { status: 502 });
    }

    return NextResponse.json({ error: "تعذر إرسال رمز التحقق. تحقق من الرقم وأعد المحاولة." }, { status: 500 });
  }
}
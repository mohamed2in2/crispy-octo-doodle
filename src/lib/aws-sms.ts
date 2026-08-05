import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { normalizeEgyptPhone } from "@/lib/phone";

const awsRegion = process.env.AWS_REGION || "eu-north-1";
const snsClient = new SNSClient({
  region: awsRegion,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
    : undefined,
});

export type AwsSmsResult = { method: "dev" | "sns"; dev?: boolean; code?: string; messageId?: string };

export function isPhoneVerificationBypassed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return ["BYPASS_PHONE_VERIFICATION", "DEV_SKIP_SMS", "TWILIO_BYPASS_VERIFICATION"]
    .some((key) => process.env[key] === "true");
}

export async function sendVerificationSms(phone: string, code: string): Promise<AwsSmsResult> {
  const toNumber = typeof phone === "string" && /^\+20\d{10}$/.test(phone) ? phone : normalizeEgyptPhone(phone);
  if (isPhoneVerificationBypassed()) {
    console.warn("SMS delivery skipped by a non-production development bypass");
    return { dev: true, code, method: "dev" };
  }

  const command = new PublishCommand({
    Message: `رمز التحقق من Code-UP: ${code}. ينتهي خلال 10 دقائق.`,
    PhoneNumber: toNumber,
    MessageAttributes: {
      "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" },
      "AWS.SNS.SMS.SenderID": { DataType: "String", StringValue: "CodeUP" },
    },
  });

  try {
    const response = await snsClient.send(command);
    return { method: "sns", messageId: response.MessageId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown SNS failure";
    console.error("AWS SNS SMS delivery failed", { message });
    throw new Error("SMS delivery failed");
  }
}

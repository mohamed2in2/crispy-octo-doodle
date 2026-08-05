import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { normalizeEgyptPhone } from "@/lib/phone";

const awsRegion = process.env.AWS_REGION || "eu-north-1";

const snsClient = new SNSClient({
  region: awsRegion,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export type AwsSmsResult = {
  method: "dev" | "sns";
  dev?: boolean;
  code?: string;
  messageId?: string;
};

/** Development-only escape hatch. It is deliberately impossible in production. */
function shouldSkipSmsInDevelopment(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.DEV_SKIP_SMS === "true" ||
      process.env.BYPASS_PHONE_VERIFICATION === "true")
  );
}

export async function sendVerificationSms(phone: string, code: string): Promise<AwsSmsResult> {
  const toNumber =
    typeof phone === "string" && /^\+20\d{10}$/.test(phone)
      ? phone
      : normalizeEgyptPhone(phone);

  if (shouldSkipSmsInDevelopment()) {
    console.log(`[AWS SNS DEV_SKIP] Skipping SMS to ${toNumber}`);
    return { dev: true, code, method: "dev" };
  }

  const message = `رمز التحقق من Code-UP: ${code}. ينتهي خلال 10 دقائق.`;
  const command = new PublishCommand({
    Message: message,
    PhoneNumber: toNumber,
    MessageAttributes: {
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional",
      },
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: "CodeUP",
      },
    },
  });

  try {
    const response = await snsClient.send(command);
    console.log(`[AWS SNS SMS] Message sent to ${toNumber}; MessageId=${response.MessageId}`);
    return { method: "sns", messageId: response.MessageId };
  } catch (err: unknown) {
    console.error(`[AWS SNS SMS] Error sending SMS to ${toNumber}:`, err);
    throw new Error("AWS SNS SMS delivery failed");
  }
}

/** Never allow bypassing the verification-code comparison in production. */
export function isPhoneVerificationBypassed(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.BYPASS_PHONE_VERIFICATION === "true"
  );
}

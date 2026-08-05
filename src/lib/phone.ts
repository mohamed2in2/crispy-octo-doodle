const EGYPT_MOBILE_REGEX = /^01[0-9]{9}$/;

export function normalizeEgyptPhone(input: string) {
  const raw = String(input || "").trim();
  const arabicMap: Record<string, string> = {
    "\u0660": "0", "\u0661": "1", "\u0662": "2", "\u0663": "3", "\u0664": "4", "\u0665": "5", "\u0666": "6", "\u0667": "7", "\u0668": "8", "\u0669": "9",
    "\u06F0": "0", "\u06F1": "1", "\u06F2": "2", "\u06F3": "3", "\u06F4": "4", "\u06F5": "5", "\u06F6": "6", "\u06F7": "7", "\u06F8": "8", "\u06F9": "9",
  };
  const cleaned = raw.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => arabicMap[digit] || digit)
    .replace(/^00/, "+");

  // If the input is already E.164 (starts with +), accept as-is to support non-Egyptian E.164 numbers.
  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.startsWith("20") && digitsOnly.length === 12) {
      return `+${digitsOnly}`;
    }
    return cleaned;
  }

  const digits = cleaned.replace(/\D/g, "");
  if ((digits.startsWith("20") || digits.startsWith("2")) && digits.length === 12) {
    return `+${digits}`;
  }

  if (EGYPT_MOBILE_REGEX.test(digits)) {
    return `+20${digits.slice(1)}`;
  }

  const found = digits.match(/01[0-9]{9}/);
  if (found) {
    return `+20${found[0].slice(1)}`;
  }

  throw new Error("رقم الهاتف غير صالح. استخدم رقم مصري يبدأ بـ 01");
}

export function formatDisplayPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return digits;
  }
  if (digits.startsWith("20") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith("2") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return input;
}

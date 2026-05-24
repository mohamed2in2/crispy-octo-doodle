import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

async function importFresh<T>(specifier: string): Promise<T> {
  const url = new URL(specifier, import.meta.url);
  url.searchParams.set('t', `${Date.now()}-${Math.random()}`);
  return import(url.href) as Promise<T>;
}

async function testPhoneNormalization() {
  const { normalizeEgyptPhone, formatDisplayPhone } = await importFresh<typeof import('../src/lib/phone.ts')>('../src/lib/phone.ts');

  assert.equal(normalizeEgyptPhone('01101670389'), '+201101670389');
  assert.equal(normalizeEgyptPhone('+201101670389'), '+201101670389');
  assert.equal(normalizeEgyptPhone('201101670389'), '+201101670389');
  assert.equal(formatDisplayPhone('+201101670389'), '01101670389');
  assert.throws(() => normalizeEgyptPhone('12345'), /رقم الهاتف غير صالح/);
}

async function testDevMockSms() {
  process.env.DEV_SKIP_SMS = 'true';
  process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'AC00000000000000000000000000000000';
  process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'x'.repeat(32);
  process.env.TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '+201000000000';
  delete process.env.TWILIO_USE_VERIFY;

  const mod = await importFresh<typeof import('../src/lib/twilio.ts')>('../src/lib/twilio.ts');
  const result = await mod.sendVerificationSms('01101670389', '123456');

  assert.equal(result.method, 'dev');
  assert.equal(result.code, '123456');
  assert.equal(result.dev, true);
}

async function testVerifySmsRequestShape() {
  process.env.DEV_SKIP_SMS = 'false';
  process.env.TWILIO_USE_VERIFY = 'true';
  process.env.TWILIO_VERIFY_SERVICE_SID = 'VA11111111111111111111111111111111';
  process.env.TWILIO_API_KEY_SID = 'SK11111111111111111111111111111111';
  process.env.TWILIO_API_SECRET = 's'.repeat(32);

  const calls: Array<{ url: string; options: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), options: init || {} });
    return new Response(JSON.stringify({ sid: 'VE123', status: 'pending' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const mod = await importFresh<typeof import('../src/lib/twilio.ts')>('../src/lib/twilio.ts');
    const result = await mod.sendVerificationSms('01101670389', '654321');

    assert.equal(result.method, 'verify');
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /verify\.twilio\.com\/v2\/Services\/VA11111111111111111111111111111111\/Verifications$/);

    const body = String(calls[0].options.body || '');
    assert.match(body, /To=%2B201101670389/);
    assert.match(body, /Channel=sms/);

    const auth = String(calls[0].options.headers && (calls[0].options.headers as Record<string, string>).Authorization || '');
    assert.ok(auth.startsWith('Basic '));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  await testPhoneNormalization();
  await testDevMockSms();
  await testVerifySmsRequestShape();
  console.log('verification tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { describe, expect, it } from "vitest";
import {
  assertMethodProviderSeparation,
  SHA7NAWY_METHODS,
  SHAKEOUT_METHODS,
} from "./PaymentService";

describe("payment provider separation", () => {
  it("allows fawry only on shake-out", () => {
    expect(SHAKEOUT_METHODS.has("fawry")).toBe(true);
    expect(SHAKEOUT_METHODS.has("vf_cash")).toBe(false);
    const ok = assertMethodProviderSeparation("fawry");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.provider).toBe("shakeout");
  });

  it("allows only listed wallets on sha7nawy", () => {
    for (const m of ["vf_cash", "et_cash"]) {
      expect(SHA7NAWY_METHODS.has(m)).toBe(true);
      const gate = assertMethodProviderSeparation(m);
      expect(gate.ok).toBe(true);
      if (gate.ok) expect(gate.provider).toBe("sha7nawy");
    }
  });

  it("rejects we_pay, cards, and instapay", () => {
    for (const m of ["we_pay", "bank_card", "meeza", "instapay"]) {
      const gate = assertMethodProviderSeparation(m);
      expect(gate.ok).toBe(false);
    }
  });

  it("rejects unknown methods", () => {
    const gate = assertMethodProviderSeparation("not_a_real_method");
    expect(gate.ok).toBe(false);
  });
});

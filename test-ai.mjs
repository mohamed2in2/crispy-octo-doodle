

async function testPrimary() {
  try {
    const res = await fetch("https://aiprimetech.io/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "sk-641f0a30b21f793739949e6bfa21ed6b1da061943e41da30b0a48fc6a7ce9142",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1200,
        messages: [{ role: "user", content: "hello" }]
      }),
      signal: AbortSignal.timeout(5000),
    });
    console.log("Primary status:", res.status);
    const text = await res.text();
    console.log("Primary body:", text);
  } catch (e) {
    console.error("Primary error:", e.message);
  }
}

async function testBackup() {
  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AQ.Ab8RN6LmrXvi0BfNh2I5IP45JS4j_VpLpfsvqBUM2Qrgge1S7g";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "hello" }] }]
      }),
      signal: AbortSignal.timeout(5000),
    });
    console.log("Backup status:", res.status);
    const text = await res.text();
    console.log("Backup body:", text);
  } catch (e) {
    console.error("Backup error:", e.message);
  }
}

testPrimary();
testBackup();

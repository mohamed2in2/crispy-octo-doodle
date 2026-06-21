import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "#0A1521", color: "#9DB1C5", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "56px 28px 0", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 40 }}>

        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
            <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10 12 5 2 10l10 5 10-5Z"/>
                <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>
              </svg>
            </span>
            <b style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 20, color: "#F3F6FA", letterSpacing: "-.3px" }}>Code-UP</b>
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.9, color: "#8295A8", maxWidth: 340, margin: 0 }}>
            منصة كورسات مصرية تهدف إلى تمكين المتعلمين من المحتوى عالي الجودة وأدوات المتابعة الذكية المبنية على الذكاء الاصطناعي.
          </p>
        </div>

        {/* Platform */}
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#5E7186", letterSpacing: ".5px", margin: "0 0 18px" }}>المنصة</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13 }}>
            {[
              { href: "/courses",     label: "الكورسات" },
              { href: "/library",     label: "مكتبتي" },
              { href: "/account",     label: "حسابي" },
              { href: "/leaderboard", label: "لوحة الشرف" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} style={{ color: "#A8B8C8", textDecoration: "none", fontSize: 14.5 }}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#5E7186", letterSpacing: ".5px", margin: "0 0 18px" }}>قانوني</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13 }}>
            <li><Link href="/terms" style={{ color: "#A8B8C8", textDecoration: "none", fontSize: 14.5 }}>شروط الاستخدام</Link></li>
            <li><Link href="/privacy" style={{ color: "#A8B8C8", textDecoration: "none", fontSize: 14.5 }}>سياسة الخصوصية</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#5E7186", letterSpacing: ".5px", margin: "0 0 18px" }}>تواصل</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13 }}>
            <li style={{ color: "#A8B8C8", fontSize: 14.5, direction: "ltr", textAlign: "right" }}>contact@code-up.tech</li>
            <li style={{ color: "#A8B8C8", fontSize: 14.5, direction: "ltr", textAlign: "right" }}>012 8535 3604</li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ maxWidth: 1320, margin: "48px auto 0", padding: "20px 28px", borderTop: "1px solid #16273A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "#5E7186" }}>© Code-UP {year} — جميع الحقوق محفوظة.</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/adminpanel" style={{ fontSize: 12, color: "#3C4D5E", textDecoration: "none" }} aria-label="لوحة الإدارة">⚙</Link>
          <a href="https://kemetcraft.me/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: "#3C4D5E", letterSpacing: 1, textDecoration: "none" }}>2n2 DEV</a>
        </div>
      </div>
    </footer>
  );
}

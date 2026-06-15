import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#0b0f19] text-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">

          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group" aria-label="Code-UP — الرئيسية">
              <img src="/logo.jpeg" alt="" aria-hidden className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-black text-lg text-white tracking-tight">Code-UP</span>
            </Link>
            <p className="text-sm leading-relaxed text-white/40 max-w-xs">
              منصة كورسات مصرية تهدف إلى تمكين المتعلمين من المحتوى عالي الجودة وأدوات المتابعة الذكية.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold text-white/25 uppercase tracking-widest mb-4">المنصة</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/",        label: "الرئيسية" },
                { href: "/courses", label: "الكورسات" },
                { href: "/library", label: "مكتبتي" },
                { href: "/account", label: "حسابي" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-white/45 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold text-white/25 uppercase tracking-widest mb-4">قانوني</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/terms" className="text-white/45 hover:text-white transition-colors">
                  شروط الاستخدام
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/45 hover:text-white transition-colors">
                  سياسة الخصوصية
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold text-white/25 uppercase tracking-widest mb-4">تواصل</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:contact@code-up.tech"
                  className="text-white/45 hover:text-white transition-colors break-all"
                  dir="ltr"
                >
                  contact@code-up.tech
                </a>
              </li>
              <li>
                <a
                  href="tel:+201285353604"
                  className="text-white/45 hover:text-white transition-colors"
                  dir="ltr"
                >
                  01285353604
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25">
            © {year} Code-UP. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/adminpanel"
              aria-label="Admin Panel"
              className="text-xs text-white/15 hover:text-white/50 transition-colors"
              title="لوحة الإدارة"
            >
              ⚙
            </Link>
            <a
              href="https://kemetcraft.me/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Developer: 2n2 DEV"
              className="text-xs text-white/15 hover:text-white/50 transition-colors"
            >
              2n2 DEV
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

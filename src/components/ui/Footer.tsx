import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/40 dark:border-white/5 bg-white/80 dark:bg-slate-950/70 text-slate-700 dark:text-slate-300 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 dark:from-amber-400 dark:via-yellow-400 dark:to-orange-500 flex items-center justify-center shadow-lg">
                <span className="text-white dark:text-slate-950 font-black text-lg">A</span>
              </div>
              <span className="font-black text-xl text-slate-900 dark:text-white">ALASLY</span>
            </div>
            <p className="text-sm leading-relaxed">
              <span className="block text-slate-600 dark:text-slate-400">منصة تعليمية تركّز على وضوح المحتوى، راحة العين، وتجربة تعلم احترافية.</span>
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-slate-900 dark:text-white">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-blue-500 transition-colors">الرئيسية</Link></li>
              <li><Link href="/courses" className="hover:text-blue-500 transition-colors">الكورسات</Link></li>
              <li><Link href="/library" className="hover:text-blue-500 transition-colors">مكتبتي</Link></li>
              <li><Link href="/account" className="hover:text-blue-500 transition-colors">حسابي</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-slate-900 dark:text-white">تواصل معنا</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/signup" className="hover:text-blue-500 transition-colors">إنشاء حساب</Link></li>
              <li><Link href="/login" className="hover:text-blue-500 transition-colors">تسجيل الدخول</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/50 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} ALASLY. جميع الحقوق محفوظة.
          </p>

          {/* Almost-hidden admin/teacher link: appears on hover */}
          <Link
            href="/adminpanel/teacher"
            title="Admin / Teacher Panel"
            className="px-2 py-1 rounded text-xs opacity-20 hover:opacity-100 focus:opacity-100 transition-opacity text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-amber-400 hover:underline"
            aria-label="Admin / Teacher Panel access"
          >
            ⚙
          </Link>
        </div>
      </div>
    </footer>
  );
}

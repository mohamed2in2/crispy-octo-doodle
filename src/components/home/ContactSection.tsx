export function ContactSection() {
  return (
    <section className="py-20 bg-white dark:bg-gray-950" id="contact">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            تواصل معنا
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            نحن هنا للإجابة على أسئلتك ومساعدتك في أي وقت
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Platform contact */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🏫</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">المنصة</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">للاستفسارات العامة</p>
              </div>
            </div>
            <ul className="space-y-4">
              <li>
                <a
                  href="mailto:contact@alasly.live"
                  className="flex items-center gap-3 group"
                >
                  <span className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex items-center justify-center shadow-sm shrink-0 group-hover:border-blue-400 transition-colors">
                    📧
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-all text-sm font-medium">
                    contact@alasly.live
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+201090764334"
                  className="flex items-center gap-3 group"
                  dir="ltr"
                >
                  <span className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex items-center justify-center shadow-sm shrink-0 group-hover:border-blue-400 transition-colors">
                    📞
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm font-medium">
                    01090764334
                  </span>
                </a>
              </li>
            </ul>
          </div>

          {/* Developer contact */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">💻</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">المطوّر</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">هل تريد موقعاً مشابهاً؟</p>
              </div>
            </div>
            <ul className="space-y-4">
              <li>
                <a
                  href="tel:+201101670389"
                  className="flex items-center gap-3 group"
                  dir="ltr"
                >
                  <span className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-purple-100 dark:border-gray-700 flex items-center justify-center shadow-sm shrink-0 group-hover:border-purple-400 transition-colors">
                    📞
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors text-sm font-medium">
                    01101670389
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:ahmedehab2n5@gmail.com"
                  className="flex items-center gap-3 group"
                >
                  <span className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 border border-purple-100 dark:border-gray-700 flex items-center justify-center shadow-sm shrink-0 group-hover:border-purple-400 transition-colors">
                    📧
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors break-all text-sm font-medium">
                    ahmedehab2n5@gmail.com
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

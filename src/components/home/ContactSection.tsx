export function ContactSection() {
  return (
    <section className="py-20 bg-[#0b0f19] border-t border-white/5" id="contact">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-10">
          <h2 className="text-balance text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
            تواصل معنا
          </h2>
          <p className="text-white/45 text-sm md:text-base">
            نحن هنا للإجابة على أسئلتك في أي وقت
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="mailto:contact@code-up.tech"
            className="group flex items-center gap-4 px-6 py-5 rounded-2xl border border-white/8 bg-white/3 hover:border-sky-400/30 hover:bg-sky-400/5 transition-all"
          >
            <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 group-hover:border-sky-400/30 transition-colors">
              <svg className="w-5 h-5 text-white/40 group-hover:text-sky-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <p className="text-xs text-white/35 font-medium mb-0.5">البريد الإلكتروني</p>
              <p className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors break-all" dir="ltr">
                contact@code-up.tech
              </p>
            </div>
          </a>

          <a
            href="tel:+201285353604"
            className="group flex items-center gap-4 px-6 py-5 rounded-2xl border border-white/8 bg-white/3 hover:border-sky-400/30 hover:bg-sky-400/5 transition-all"
            dir="rtl"
          >
            <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0 group-hover:border-sky-400/30 transition-colors">
              <svg className="w-5 h-5 text-white/40 group-hover:text-sky-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </span>
            <div>
              <p className="text-xs text-white/35 font-medium mb-0.5">الهاتف</p>
              <p className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors" dir="ltr">
                01285353604
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

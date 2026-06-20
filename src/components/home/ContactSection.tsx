interface ContactSectionProps {
  heading?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
}

export function ContactSection({
  heading = "تواصل معنا",
  subtitle = "نحن هنا للإجابة على أسئلتك في أي وقت",
  email = "contact@code-up.tech",
  phone = "01285353604",
}: ContactSectionProps = {}) {
  // tel: wants the international form; display keeps the local number as entered.
  const telHref = `+2${phone.startsWith("0") ? phone.slice(1) : phone}`;
  return (
    <section className="py-20 bg-slate-50 dark:bg-[#0b0f19] border-t border-slate-200/60 dark:border-white/5" id="contact">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-10">
          <h2 className="text-balance text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            {heading}
          </h2>
          <p className="text-slate-500 dark:text-white/45 text-sm md:text-base">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href={`mailto:${email}`}
            className="group flex items-center gap-4 px-6 py-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-white/8 dark:bg-white/3 dark:hover:border-sky-400/30 dark:hover:bg-sky-400/5 transition-all shadow-sm dark:shadow-none"
          >
            <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/8 flex items-center justify-center shrink-0 group-hover:border-indigo-300 dark:group-hover:border-sky-400/30 transition-colors">
              <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 dark:text-white/40 dark:group-hover:text-sky-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <p className="text-xs text-slate-400 dark:text-white/35 font-medium mb-0.5">البريد الإلكتروني</p>
              <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 dark:text-white/70 dark:group-hover:text-white transition-colors break-all" dir="ltr">
                {email}
              </p>
            </div>
          </a>

          <a
            href={`tel:${telHref}`}
            className="group flex items-center gap-4 px-6 py-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-white/8 dark:bg-white/3 dark:hover:border-sky-400/30 dark:hover:bg-sky-400/5 transition-all shadow-sm dark:shadow-none"
            dir="rtl"
          >
            <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/8 flex items-center justify-center shrink-0 group-hover:border-indigo-300 dark:group-hover:border-sky-400/30 transition-colors">
              <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 dark:text-white/40 dark:group-hover:text-sky-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </span>
            <div>
              <p className="text-xs text-slate-400 dark:text-white/35 font-medium mb-0.5">الهاتف</p>
              <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 dark:text-white/70 dark:group-hover:text-white transition-colors" dir="ltr">
                {phone}
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

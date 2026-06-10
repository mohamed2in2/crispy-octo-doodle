export function FeaturesSection() {
  return (
    <section className="py-16 md:py-32 bg-[#0B0F19] relative z-10 border-t border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 md:mb-24 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-bold mb-6 border border-indigo-500/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            مميزات المنصة
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 md:mb-6 tracking-tight leading-tight">
            لماذا تختار{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">منصتنا؟</span>
          </h2>
          <p className="text-gray-400 text-base md:text-xl max-w-2xl mx-auto font-medium leading-relaxed px-2">
            بنيت منصتنا لتجمع بين التكنولوجيا الحديثة والتجربة الإنسانية، لتوفر لك بيئة تعليمية ذكية ومريحة تلبي كل احتياجاتك.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-auto md:auto-rows-[340px]">
          
          {/* Feature 1 - Wide Card */}
          <div className="md:col-span-2 bg-gradient-to-br from-[#151B2B] to-[#0F141F] rounded-[2rem] p-6 md:p-10 border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden flex flex-col md:flex-row items-center md:items-stretch gap-8 shadow-xl shadow-black/20 text-center md:text-right">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-colors pointer-events-none"></div>
            
            <div className="flex-1 relative z-10 flex flex-col justify-center items-center md:items-start">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 md:mb-6 border border-indigo-500/20 shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
              </div>
              <h3 className="font-black text-white text-2xl md:text-3xl mb-3 tracking-tight">مجتمع تفاعلي متكامل</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-lg max-w-md">تواصل مع زملائك والمعلمين بحرية. اطرح أسئلتك، وشارك في نقاشات هادفة في بيئة مصممة خصيصاً للتعلم ومشاركة المعرفة.</p>
            </div>

            {/* Decorative Visual for Wide Card */}
            <div className="hidden md:flex flex-1 justify-end relative z-10 w-full h-full">
              <div className="relative w-full h-full min-h-[200px]">
                <div className="absolute right-4 top-4 w-48 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transform rotate-6 group-hover:rotate-12 transition-transform duration-500">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400"></div>
                    <div className="w-20 h-2 rounded-full bg-white/20"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-2 rounded-full bg-white/10"></div>
                    <div className="w-3/4 h-2 rounded-full bg-white/10"></div>
                  </div>
                </div>
                <div className="absolute left-4 bottom-4 w-48 p-4 bg-indigo-500/20 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl transform -rotate-6 group-hover:-rotate-12 transition-transform duration-500 delay-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-400"></div>
                    <div className="w-24 h-2 rounded-full bg-white/30"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-2 rounded-full bg-white/20"></div>
                    <div className="w-5/6 h-2 rounded-full bg-white/20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - Square Card */}
          <div className="md:col-span-1 bg-gradient-to-br from-[#151B2B] to-[#0F141F] rounded-[2rem] p-6 md:p-8 border border-white/5 hover:border-fuchsia-500/30 transition-all group relative overflow-hidden flex flex-col justify-center text-center items-center shadow-xl shadow-black/20 min-h-[260px] md:min-h-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-fuchsia-500/10 blur-[70px] rounded-full group-hover:bg-fuchsia-500/20 transition-colors pointer-events-none"></div>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-fuchsia-500/10 rounded-2xl md:rounded-[2rem] flex items-center justify-center text-fuchsia-400 mb-4 md:mb-6 group-hover:scale-110 transition-transform border border-fuchsia-500/20 relative z-10 shadow-lg shadow-fuchsia-500/10 rotate-3 group-hover:-rotate-3">
              <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <div className="relative z-10">
              <h3 className="font-bold text-white text-xl md:text-2xl mb-2 md:mb-3 tracking-tight">اختبارات ذكية</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base px-2">أسئلة تفاعلية تقيم مستواك الفعلي وتساعدك على التطور.</p>
            </div>
          </div>

          {/* Feature 3 - Square Card */}
          <div className="md:col-span-1 bg-gradient-to-br from-[#151B2B] to-[#0F141F] rounded-[2rem] p-6 md:p-8 border border-white/5 hover:border-emerald-500/30 transition-all group relative overflow-hidden flex flex-col justify-center text-center items-center shadow-xl shadow-black/20 min-h-[260px] md:min-h-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-emerald-500/10 blur-[70px] rounded-full group-hover:bg-emerald-500/20 transition-colors pointer-events-none"></div>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/10 rounded-2xl md:rounded-[2rem] flex items-center justify-center text-emerald-400 mb-4 md:mb-6 group-hover:scale-110 transition-transform border border-emerald-500/20 relative z-10 shadow-lg shadow-emerald-500/10 -rotate-3 group-hover:rotate-3">
              <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <div className="relative z-10">
              <h3 className="font-bold text-white text-xl md:text-2xl mb-2 md:mb-3 tracking-tight">مرشد أكاديمي</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base px-2">نظام توجيه مستمر يوفر الإجابات والمسار الأفضل للتعلم.</p>
            </div>
          </div>

          {/* Feature 4 - Wide Card */}
          <div className="md:col-span-2 bg-gradient-to-br from-[#151B2B] to-[#0F141F] rounded-[2rem] p-6 md:p-10 border border-white/5 hover:border-rose-500/30 transition-all group relative overflow-hidden flex flex-col md:flex-row items-center md:items-stretch gap-8 shadow-xl shadow-black/20 text-center md:text-right">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-rose-500/10 blur-[100px] rounded-full group-hover:bg-rose-500/20 transition-colors pointer-events-none"></div>
            
            <div className="flex-1 relative z-10 flex flex-col justify-center items-center md:items-start">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 mb-4 md:mb-6 border border-rose-500/20 shadow-lg shadow-rose-500/10 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h3 className="font-black text-white text-2xl md:text-3xl mb-3 tracking-tight">تحليلات دقيقة</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-lg max-w-md">راقب تقدمك خطوة بخطوة من خلال إحصائيات بصرية ورسوم بيانية لأدائك في الكورسات تحدد نقاط قوتك وضعفك.</p>
            </div>

            {/* Decorative Visual */}
            <div className="hidden md:flex flex-1 justify-end relative z-10 w-full h-full">
              <div className="relative w-full h-full min-h-[200px] flex items-end justify-center gap-4 pb-4">
                <div className="w-12 bg-gradient-to-t from-rose-500/40 to-rose-400/80 rounded-t-xl h-24 transform group-hover:h-32 transition-all duration-500"></div>
                <div className="w-12 bg-gradient-to-t from-rose-500/40 to-rose-400/80 rounded-t-xl h-36 transform group-hover:h-48 transition-all duration-500 delay-75"></div>
                <div className="w-12 bg-gradient-to-t from-rose-500/40 to-rose-400/80 rounded-t-xl h-20 transform group-hover:h-40 transition-all duration-500 delay-150"></div>
                <div className="w-12 bg-gradient-to-t from-rose-500/40 to-rose-400/80 rounded-t-xl h-48 transform group-hover:h-56 transition-all duration-500 delay-200"></div>
              </div>
            </div>
          </div>

          {/* Feature 5 - Extra Wide Card */}
          <div className="md:col-span-3 bg-gradient-to-br from-[#151B2B] to-[#0F141F] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-14 border border-white/5 hover:border-cyan-500/30 transition-all group relative overflow-hidden flex flex-col md:flex-row items-center md:items-stretch gap-8 md:gap-12 shadow-xl shadow-black/20 text-center md:text-right">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-cyan-500/10 blur-[120px] rounded-full group-hover:bg-cyan-500/20 transition-colors pointer-events-none"></div>
            
            <div className="flex-1 relative z-10 flex flex-col justify-center items-center md:items-start">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400 mb-4 md:mb-6 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              </div>
              <h3 className="font-black text-white text-2xl md:text-3xl mb-3 tracking-tight">تجربة بصرية مريحة</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-lg max-w-2xl">استمتع بواجهة مستخدم عصرية بتصميم داكن مريح للعين، مصمم خصيصاً لتتمكن من المذاكرة لفترات طويلة دون إرهاق بصري. كل تفصيلة صممت لتوفير تجربة خالية من التشتت.</p>
            </div>

            {/* Decorative Visual */}
            <div className="hidden md:flex flex-1 justify-end relative z-10 w-full h-full">
              <div className="relative w-full max-w-sm h-48 bg-[#0B0F19] rounded-2xl border border-white/10 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500 flex flex-col mt-4 md:mt-0">
                {/* Mock UI Header */}
                <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                </div>
                {/* Mock UI Body */}
                <div className="flex-1 p-4 flex gap-4">
                  <div className="w-1/3 h-full rounded-xl bg-white/5"></div>
                  <div className="w-2/3 h-full flex flex-col gap-3">
                    <div className="w-full h-8 rounded-lg bg-white/5"></div>
                    <div className="w-3/4 h-4 rounded-full bg-white/5"></div>
                    <div className="w-1/2 h-4 rounded-full bg-white/5"></div>
                  </div>
                </div>
                {/* Overlay Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent pointer-events-none"></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

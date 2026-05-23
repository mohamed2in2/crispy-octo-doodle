const features = [
  {
    icon: "🎬",
    title: "فيديوهات محمية",
    desc: "محتوى فيديو محمي بالكامل عبر تقنية Bunny CDN لمنع التحميل غير المصرح",
    color: "bg-blue-500",
  },
  {
    icon: "📝",
    title: "اختبارات تفاعلية",
    desc: "اختبر نفسك بعد كل محاضرة باختبارات متعددة الخيارات مع تقرير فوري لأدائك",
    color: "bg-purple-500",
  },
  {
    icon: "🤖",
    title: "مساعد دراسي بالذكاء الاصطناعي",
    desc: "احصل على خطة دراسية يومية مخصصة تماماً بناءً على كورساتك ومستوى تقدمك",
    color: "bg-green-500",
  },
  {
    icon: "🔑",
    title: "أكواد الوصول",
    desc: "احصل على كود من مدرسك للوصول الفوري لجميع محتوى الكورس الحالي والمستقبلي",
    color: "bg-orange-500",
  },
  {
    icon: "📊",
    title: "متابعة التقدم",
    desc: "راقب تقدمك الدراسي ونتائج اختباراتك بشكل مرئي وسهل الفهم",
    color: "bg-red-500",
  },
  {
    icon: "🌙",
    title: "الوضع الليلي",
    desc: "تجربة مريحة للعين في أي وقت بفضل الدعم الكامل للوضع الليلي",
    color: "bg-indigo-500",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
            لماذا تختار{" "}
            <span className="gradient-text">منصتنا؟</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            منصة متكاملة صممت خصيصاً لتلبية احتياجات الطالب المصري بأعلى معايير الجودة
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg transition-all group"
            >
              <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

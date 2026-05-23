const stats = [
  { value: "٥٠٠٠+", label: "طالب نشط" },
  { value: "٢٠٠+", label: "كورس متاح" },
  { value: "٥٠+", label: "مدرس متميز" },
  { value: "٩٨٪", label: "نسبة الرضا" },
];

export function StatsSection() {
  return (
    <section className="py-16 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-black gradient-text mb-2">{s.value}</div>
              <div className="text-gray-500 dark:text-gray-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

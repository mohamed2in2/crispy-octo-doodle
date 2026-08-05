import { cache } from "react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RESERVED_SLUGS } from "@/lib/slug";
import { safeAccent } from "@/lib/classic/accent";
import { bookingAvailability, canPayNow } from "@/lib/classic/booking";
import { BookingButton } from "@/components/teacher/BookingModal";
import { SubscriptionStatusBadge } from "@/components/teacher/SubscriptionStatusBadge";
import { SetTeacherRefCookie } from "@/components/teacher/SetTeacherRefCookie";

export const revalidate = 60; // Cache page for 60s for lightning fast <10ms loads

const getProfile = cache(async (slug: string) => {
  if (RESERVED_SLUGS.has(slug.toLowerCase())) return null;
  return prisma.teacherProfile.findFirst({
    where: { slug, isPublished: true, teacher: { isDeleted: false } },
    include: {
      teacher: {
        include: {
          courses: {
            orderBy: { createdAt: "desc" },
            include: {
              folders: { include: { videos: { select: { id: true, isFree: true } } } },
            },
          },
        },
      },
    },
  });
});

export async function generateMetadata({ params }: { params: Promise<{ teacherSlug: string }> }): Promise<Metadata> {
  const { teacherSlug } = await params;
  const p = await getProfile(teacherSlug);
  if (!p) return { title: "\u0635\u0641\u062d\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629 \u2014 Code-UP" };
  const name = p.displayName ?? p.teacher.name;
  const description = p.bio ?? `\u0643\u0648\u0631\u0633\u0627\u062a ${name} \u0639\u0644\u0649 Code-UP`;
  return {
    title: `${name} \u2014 Code-UP`,
    description,
    openGraph: {
      title: name,
      description,
      type: "profile",
    },
    twitter: { card: "summary_large_image", title: name, description },
  };
}

const STAGE_LABELS: Record<string, string> = {
  // أولى بكالوريا
  sec_1: "\u0623\u0648\u0644\u0649 \u0628\u0643\u0627\u0644\u0648\u0631\u064a\u0627",
  // ثانية بكالوريا
  sec_2: "\u062b\u0627\u0646\u064a\u0629 \u0628\u0643\u0627\u0644\u0648\u0631\u064a\u0627",
};

// Every string the booking states need, kept next to the states themselves.
const BOOKING_COPY = {
  // الكورس يبدأ في
  startsOn: "\u0627\u0644\u0643\u0648\u0631\u0633 \u064a\u0628\u062f\u0623 \u0641\u064a",
  // الكورس بدأ في
  startedOn: "\u0627\u0644\u0643\u0648\u0631\u0633 \u0628\u062f\u0623 \u0641\u064a",
  // وتقدر تلحق المحاضرات اللي فاتت.
  catchUp:
    "\u0648\u062a\u0642\u062f\u0631 \u062a\u0644\u062d\u0642 \u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a \u0627\u0644\u0644\u064a \u0641\u0627\u062a\u062a.",
  // تواصل للحجز
  contact: "\u062a\u0648\u0627\u0635\u0644 \u0644\u0644\u062d\u062c\u0632",
  // الحجز عند المدرس نفسه، كلمه وهو هيسجلك.
  contactWhy:
    "\u0627\u0644\u062d\u062c\u0632 \u0639\u0646\u062f \u0627\u0644\u0645\u062f\u0631\u0633 \u0646\u0641\u0633\u0647\u060c \u0643\u0644\u0645\u0647 \u0648\u0647\u0648 \u0647\u064a\u0633\u062c\u0644\u0643.",
  // الاشتراك مقفول حالياً. تقدر تشتري أي كورس من تحت مباشرة.
  closed:
    "\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0645\u0642\u0641\u0648\u0644 \u062d\u0627\u0644\u064a\u0627\u064b. \u062a\u0642\u062f\u0631 \u062a\u0634\u062a\u0631\u064a \u0623\u064a \u0643\u0648\u0631\u0633 \u0645\u0646 \u062a\u062d\u062a \u0645\u0628\u0627\u0634\u0631\u0629.",
} as const;

const isSafe = (s?: string | null) => !!s && (/^https?:\/\//i.test(s) || s.startsWith("data:image/") || s.startsWith("/"));

const formatDay = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(date);
};

export default async function TeacherPage({ params }: { params: Promise<{ teacherSlug: string }> }) {
  const { teacherSlug } = await params;
  const p = await getProfile(teacherSlug);
  if (!p) notFound();

  const name = p.displayName ?? p.teacher.name;
  const courses = p.teacher.courses;
  const ordered = p.featuredCourseId
    ? [...courses].sort((a, b) => (a.id === p.featuredCourseId ? -1 : b.id === p.featuredCourseId ? 1 : 0))
    : courses;

  const videoCount = courses.reduce((s, c) => s + c.folders.reduce((b, f) => b + f.videos.length, 0), 0);
  const demo = courses
    .flatMap((c) => c.folders.flatMap((f) => f.videos.map((v) => ({ ...v, courseId: c.id }))))
    .find((v) => v.isFree);

  let socials: { facebook?: string; youtube?: string; tiktok?: string } = {};
  try { socials = p.socials ? JSON.parse(p.socials) : {}; } catch { socials = {}; }
  const socialLinks = Object.entries(socials).filter(([, v]) => v) as [string, string][];

  // One rule decides which booking control may exist on this page.
  const booking = bookingAvailability({
    isPublished: p.isPublished,
    teacherDeleted: p.teacher.isDeleted,
    priceMonthly: p.priceMonthly,
    priceTermly: p.priceTermly,
    priceYearly: p.priceYearly,
    courseStartDate: p.courseStartDate,
    bookingContactUrl: p.bookingContactUrl,
  });

  const startNote =
    booking.kind === "upcoming"
      ? [BOOKING_COPY.startsOn, formatDay(booking.startsAtIso)].filter(Boolean).join(" ")
      : booking.kind === "late"
        ? [[BOOKING_COPY.startedOn, formatDay(booking.startedAtIso)].filter(Boolean).join(" "), BOOKING_COPY.catchUp].join(" \u2014 ")
        : null;

  const accent = safeAccent(p.accentColor);

  const theme = {
    "--accent": accent,
    "--nav": p.navColor ?? "#0b0f19",
  } as CSSProperties;

  return (
    <main dir="rtl" style={theme} className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <SetTeacherRefCookie teacherId={p.teacherId} />
      {/* Top bar */}
      <nav style={{ background: "var(--nav)" }} className="px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isSafe(p.photoUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photoUrl!} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20" />
          )}
          <span className="font-black text-white">{name}</span>
        </div>
        <Link href="/courses" className="text-xs font-semibold text-white/70 hover:text-white transition-colors">
          {/* كل الكورسات ← */}
          {"\u0643\u0644 \u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a \u2190"}
        </Link>
      </nav>

      {/* Banner */}
      {isSafe(p.bannerUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.bannerUrl!} alt="" className="w-full h-40 sm:h-56 object-cover" />
      )}

      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 pt-10 pb-8 text-center">
        {isSafe(p.photoUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl!} alt={name} className="w-28 h-28 rounded-full object-cover mx-auto mb-4"
               style={{ boxShadow: "0 0 0 4px var(--accent)" }} />
        )}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-balance">{name}</h1>
        {p.bio && <p className="text-[var(--ink-muted)] mt-3 leading-relaxed max-w-2xl mx-auto text-pretty">{p.bio}</p>}

        {/* Social proof */}
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--surface)] border border-[var(--border)]">
            {/* كورس */}
            {courses.length} {"\u0643\u0648\u0631\u0633"}
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--surface)] border border-[var(--border)]">
            {/* محاضرة */}
            {videoCount} {"\u0645\u062d\u0627\u0636\u0631\u0629"}
          </span>
        </div>

        {/* Subscription Status Badge */}
        <SubscriptionStatusBadge teacherId={p.teacherId} teacherName={name} />

        {/* Booking: only the control that can actually work is rendered. */}
        {canPayNow(booking) && (
          <>
            <BookingButton
              teacherId={p.teacherId}
              bookingEnabled={p.bookingEnabled}
              arabicEnabled={p.arabicEnabled}
              languagesEnabled={p.languagesEnabled}
              priceMonthly1={p.priceMonthly1}
              priceMonthly3={p.priceMonthly3}
              priceMonthly6={p.priceMonthly6}
              originalMonthly3={p.originalMonthly3}
              originalMonthly6={p.originalMonthly6}
              langSurcharge1={p.langSurcharge1}
              langSurcharge3={p.langSurcharge3}
              langSurcharge6={p.langSurcharge6}
              enableMonthly1={p.enableMonthly1}
              enableMonthly3={p.enableMonthly3}
              enableMonthly6={p.enableMonthly6}
              priceMonthly={p.priceMonthly}
              priceTermly={p.priceTermly}
              priceYearly={p.priceYearly}
              discountMonthly={p.discountMonthly}
              discountTermly={p.discountTermly}
              discountYearly={p.discountYearly}
              courseStartDate={p.courseStartDate ? p.courseStartDate.toISOString() : null}
              bookingContactUrl={p.bookingContactUrl}
              accentColor={accent}
              teacherName={name}
            />
            {startNote && (
              <p className="mt-3 text-xs font-semibold text-[var(--ink-muted)]">{startNote}</p>
            )}
          </>
        )}

        {booking.kind === "contact" && (
          <div className="mt-6">
            <a
              href={booking.contactUrl}
              target={booking.contactUrl.startsWith("/") ? undefined : "_blank"}
              rel={booking.contactUrl.startsWith("/") ? undefined : "noreferrer noopener"}
              style={{ background: "var(--accent)" }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white hover:brightness-110 transition-all"
            >
              {BOOKING_COPY.contact}
            </a>
            <p className="mt-3 text-xs font-semibold text-[var(--ink-muted)]">{BOOKING_COPY.contactWhy}</p>
          </div>
        )}

        {booking.kind === "closed" && (
          <p className="mt-6 text-xs font-semibold text-[var(--ink-muted)]">{BOOKING_COPY.closed}</p>
        )}

        {/* Demo CTA */}
        {demo && (
          <Link href={`/courses/${demo.courseId}`}
                style={{ background: "var(--accent)" }}
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:brightness-110 transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            {/* شاهد المحاضرة الأولى مجاناً */}
            {"\u0634\u0627\u0647\u062f \u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0645\u062c\u0627\u0646\u0627\u064b"}
          </Link>
        )}

        {/* Socials */}
        {socialLinks.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-3">
            {socialLinks.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer noopener"
                 className="text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors capitalize" dir="ltr">
                {k}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Courses */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-lg font-bold mb-5">
          {/* الكورسات */}
          {"\u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a"}
        </h2>
        {ordered.length === 0 ? (
          <p className="text-center text-[var(--ink-muted)] py-12">
            {/* لا توجد كورسات منشورة بعد. */}
            {"\u0644\u0627 \u062a\u0648\u062c\u062f \u0643\u0648\u0631\u0633\u0627\u062a \u0645\u0646\u0634\u0648\u0631\u0629 \u0628\u0639\u062f."}
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((c) => {
              const featured = c.id === p.featuredCourseId;
              const vCount = c.folders.reduce((b, f) => b + f.videos.length, 0);
              return (
                <Link key={c.id} href={`/courses/${c.id}`}
                      className="group relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:shadow-xl transition-shadow">
                  {featured && (
                    <span className="absolute top-3 end-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold text-white" style={{ background: "var(--accent)" }}>
                      {/* مميّز */}
                      {"\u0645\u0645\u064a\u0651\u0632"}
                    </span>
                  )}
                  <div className="relative h-40 bg-[var(--bg)] overflow-hidden">
                    {isSafe(c.thumbnailUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumbnailUrl!} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--ink-muted)]">
                        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden><path d="M4 4h5l2 3h9a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {c.subject && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--ink-muted)]">{c.subject}</span>}
                      <span className="text-[11px] text-[var(--ink-muted)]">{STAGE_LABELS[c.educationalStage] ?? c.educationalStage}</span>
                    </div>
                    <h3 className="font-bold text-[var(--ink)] leading-snug line-clamp-2 flex-1">{c.title}</h3>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-[var(--ink-muted)]">
                        {/* محاضرة */}
                        {vCount} {"\u0645\u062d\u0627\u0636\u0631\u0629"}
                      </span>
                      <span className="text-sm font-black" style={{ color: "var(--accent)" }}>
                        {/* مجاني | جنيه */}
                        {!c.isPaid ? "\u0645\u062c\u0627\u0646\u064a" : `${c.price ?? 0} \u062c\u0646\u064a\u0647`}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-[var(--border)] py-6 text-center">
        <Link href="/" className="text-xs font-bold text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors">
          {/* مدعوم من Code-UP */}
          {"\u0645\u062f\u0639\u0648\u0645 \u0645\u0646 Code-UP"}
        </Link>
      </footer>
    </main>
  );
}

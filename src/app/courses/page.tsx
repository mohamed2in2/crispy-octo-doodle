import Link from "next/link";

import { ClassicShell } from "@/components/classic/ClassicShell";
import { PublicHeader } from "@/components/classic/PublicHeader";
import { SiteFooter } from "@/components/classic/SiteFooter";
import { Badge, Band, Empty, LinkButton } from "@/components/classic/pieces";
import { IconBook, IconSearch, IconUsers } from "@/components/classic/icons";
import { getSession } from "@/lib/auth";
import { getWalletSummary } from "@/lib/financial/data";
import { piastresToPounds } from "@/lib/financial/money";
import { getNotifications } from "@/lib/notifications/data";
import { prisma } from "@/lib/prisma";

import "@/styles/classic-tokens.css";
import "@/styles/classic-shell.css";
import "@/styles/classic-components.css";
import "@/styles/classic-landing.css";
import "@/styles/classic-courses.css";

export const dynamic = "force-dynamic";

const COPY = {
	title: "الكورسات",
	lead: "اختار المادة أو المدرس، واعرف السعر ومحتوى الكورس قبل ما تشترك.",
	search: "ابحث باسم الكورس أو المادة",
	searchButton: "بحث",
	filters: "اختيارات البحث",
	all: "الكل",
	subject: "المادة",
	teacher: "المدرس",
	stage: "المرحلة",
	results: "كورس متاح",
	lecture: "محاضرة",
	quiz: "اختبار",
	free: "مجاني",
	currency: "جنيه",
	access: "مضاف لمكتبتك",
	view: "شوف التفاصيل",
	empty: "مفيش كورسات مطابقة",
	emptyText: "غيّر كلمة البحث أو امسح بعض الاختيارات.",
	unavailable: "ابدأ الآن — تصفح أحدث الكورسات والمواد المتاحة 🚀",
	clear: "مسح الاختيارات",
} as const;

const STAGES: Record<string, string> = {
	sec_1: "أولى بكالوريا",
	sec_2: "ثانية بكالوريا",
};

type SearchValue = string | string[] | undefined;
type CourseSearch = Record<string, SearchValue>;
type CatalogCourse = {
	id: string;
	slug: string | null;
	title: string;
	description: string | null;
	subject: string;
	educationalStage: string;
	thumbnailUrl: string | null;
	isPaid: boolean;
	price: number | null;
	teacher: { id: string; name: string; teacherProfile: { displayName: string | null; photoUrl: string | null } | null };
	folders: Array<{ _count: { videos: number; quizzes: number } }>;
};
type TeacherListItem = {
	id: string;
	slug: string;
	name: string;
	photoUrl: string | null;
};

function one(value: SearchValue) {
	return (Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
}

function safeImage(value: string | null) {
	if (!value) return null;
	return /^https?:\/\//i.test(value) || value.startsWith("data:image/") || value.startsWith("/") ? value : null;
}

function formatPounds(value: number) {
	return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function money(piastres: number) {
	return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(piastresToPounds(piastres))} جنيه`;
}

function hrefWith(current: { q: string; subject: string; teacher: string; stage: string }, patch: Partial<typeof current>) {
	const next = { ...current, ...patch };
	const params = new URLSearchParams();
	if (next.q) params.set("q", next.q);
	if (next.subject) params.set("subject", next.subject);
	if (next.teacher) params.set("teacher", next.teacher);
	if (next.stage) params.set("stage", next.stage);
	return params.size ? `/courses?${params.toString()}` : "/courses";
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<CourseSearch> }) {
	const raw = await searchParams;
	const selected = { q: one(raw.q), subject: one(raw.subject), teacher: one(raw.teacher), stage: one(raw.stage) };
	const session = await getSession();
	const [wallet, notifications] = session
		? await Promise.all([getWalletSummary(), getNotifications()])
		: [null, null];

	let unavailable = false;
	let courses: CatalogCourse[] = [];
	let teacherOptions: Array<{ id: string; name: string }> = [];
	let teachers: TeacherListItem[] = [];
	let allSubjects: string[] = [];
	let allStages: string[] = [];

	try {
		const [courseRows, teacherRows, optionRows, profileRows] = await Promise.all([
			prisma.course.findMany({
				where: {
					teacher: { isDeleted: false },
					...(selected.subject ? { subject: selected.subject } : {}),
					...(selected.teacher ? { teacherId: selected.teacher } : {}),
					...(selected.stage ? { educationalStage: selected.stage } : {}),
					...(selected.q ? { OR: [
						{ title: { contains: selected.q, mode: "insensitive" as const } },
						{ subject: { contains: selected.q, mode: "insensitive" as const } },
						{ description: { contains: selected.q, mode: "insensitive" as const } },
					] } : {}),
				},
				orderBy: { createdAt: "desc" },
				take: 100,
				include: {
					teacher: { select: { id: true, name: true, teacherProfile: { select: { displayName: true, photoUrl: true } } } },
					folders: { select: { _count: { select: { videos: true, quizzes: true } } } },
				},
			}),
			prisma.user.findMany({
				where: { role: "teacher", isDeleted: false, courses: { some: {} } },
				orderBy: { name: "asc" },
				select: { id: true, name: true, teacherProfile: { select: { displayName: true } } },
			}),
			prisma.course.findMany({
				where: { teacher: { isDeleted: false } },
				select: { subject: true, educationalStage: true },
			}),
			prisma.teacherProfile.findMany({
				where: { isPublished: true, teacher: { isDeleted: false } },
				orderBy: { displayName: "asc" },
				select: {
					id: true,
					slug: true,
					displayName: true,
					photoUrl: true,
					teacher: { select: { name: true } },
				},
			}),
		]);
		courses = courseRows as CatalogCourse[];
		teacherOptions = teacherRows.map((teacher) => ({ id: teacher.id, name: teacher.teacherProfile?.displayName ?? teacher.name }));
		teachers = profileRows.map((p) => ({
			id: p.id,
			slug: p.slug,
			name: p.displayName ?? p.teacher.name,
			photoUrl: safeImage(p.photoUrl),
		}));
		allSubjects = Array.from(new Set(optionRows.map((item) => item.subject).filter(Boolean))).sort();
		allStages = Array.from(new Set(optionRows.map((item) => item.educationalStage).filter(Boolean))).sort();
	} catch {
		unavailable = true;
	}

	const access = new Set<string>();
	if (!unavailable && session?.role === "student" && courses.length) {
		try {
			const rows = await prisma.accessCode.findMany({
				where: { studentId: session.id, courseId: { in: courses.map((course) => course.id) } },
				select: { courseId: true },
			});
			rows.forEach((row) => access.add(row.courseId));
		} catch {
			// Personal access badges are optional; the public catalogue still renders.
		}
	}

	const hasFilters = Boolean(selected.q || selected.subject || selected.teacher || selected.stage);

	const content = (
		<main className="c-catalog__inner">
			<header className="c-catalog__hero">
				<div><span className="c-catalog__kicker">Code-UP</span><h1>{COPY.title}</h1><p>{COPY.lead}</p></div>
				<form className="c-catalog__search" action="/courses" method="get" role="search">
					<span aria-hidden="true"><IconSearch /></span>
					<input name="q" type="search" defaultValue={selected.q} placeholder={COPY.search} aria-label={COPY.search} />
					{selected.subject ? <input type="hidden" name="subject" value={selected.subject} /> : null}
					{selected.teacher ? <input type="hidden" name="teacher" value={selected.teacher} /> : null}
					{selected.stage ? <input type="hidden" name="stage" value={selected.stage} /> : null}
					<button type="submit">{COPY.searchButton}</button>
				</form>
			</header>

			{unavailable ? <Band tone="info" text={COPY.unavailable} /> : null}
			{!unavailable ? (
				<section className="c-catalog__filters" aria-labelledby="catalog-filters">
					<div className="c-catalog__filters-head"><h2 id="catalog-filters">{COPY.filters}</h2>{hasFilters ? <Link href="/courses">{COPY.clear}</Link> : null}</div>
					<FilterRow label={COPY.subject} allLabel={COPY.all} allHref={hrefWith(selected, { subject: "" })} allActive={!selected.subject} items={allSubjects.map((subject) => ({ key: subject, label: subject, href: hrefWith(selected, { subject }), active: selected.subject === subject }))} />
					<FilterRow label={COPY.teacher} allLabel={COPY.all} allHref={hrefWith(selected, { teacher: "" })} allActive={!selected.teacher} items={teacherOptions.map((teacher) => ({ key: teacher.id, label: teacher.name, href: hrefWith(selected, { teacher: teacher.id }), active: selected.teacher === teacher.id }))} />
					<FilterRow label={COPY.stage} allLabel={COPY.all} allHref={hrefWith(selected, { stage: "" })} allActive={!selected.stage} items={allStages.map((stage) => ({ key: stage, label: STAGES[stage] ?? stage, href: hrefWith(selected, { stage }), active: selected.stage === stage }))} />
				</section>
			) : null}

			{!unavailable && teachers.length > 0 ? (
				<section className="c-catalog__teachers">
					<div className="c-catalog__results-head"><h2>المدرسين</h2></div>
					<ul className="c-teacher-list">
						{teachers.map((t) => (
							<li key={t.id}>
								<Link className="c-teacher-row" href={`/${t.slug}`}>
									<div className="c-teacher-row__info">
										{t.photoUrl ? (
											/* eslint-disable-next-line @next/next/no-img-element */
											<img className="c-teacher-row__photo" src={t.photoUrl} alt={t.name} />
										) : (
											<span className="c-teacher-row__initial">{t.name.slice(0, 1)}</span>
										)}
										<span className="c-teacher-row__name">{t.name}</span>
									</div>
									<span className="c-teacher-row__arrow">‹</span>
								</Link>
							</li>
						))}
					</ul>
				</section>
			) : null}

			{!unavailable ? (
				<section className="c-catalog__results">
					<div className="c-catalog__results-head"><h2>{COPY.title}</h2><span dir="ltr">{courses.length} <bdi>{COPY.results}</bdi></span></div>
					{courses.length === 0 ? (
						<div className="c-card"><Empty icon={<IconBook />} title={COPY.empty} text={COPY.emptyText} action={hasFilters ? <LinkButton href="/courses" label={COPY.clear} inline /> : undefined} /></div>
					) : (
						<ul className="c-catalog-grid">
							{courses.map((course) => {
								const videos = course.folders.reduce((sum, folder) => sum + folder._count.videos, 0);
								const quizzes = course.folders.reduce((sum, folder) => sum + folder._count.quizzes, 0);
								const teacherName = course.teacher.teacherProfile?.displayName ?? course.teacher.name;
								const thumb = safeImage(course.thumbnailUrl);
								const hasAccess = access.has(course.id);
								return (
									<li key={course.id}><Link className="c-catalog-card" href={`/courses/${course.slug ?? course.id}`}>
										{thumb ? <img className="c-catalog-card__thumb" src={thumb} alt="" /> : <span className="c-catalog-card__thumb c-catalog-card__thumb--empty" aria-hidden="true"><IconBook size={34} /></span>}
										<div className="c-catalog-card__body">
											<div className="c-catalog-card__badges"><Badge label={course.subject} tone="blue" />{hasAccess ? <Badge label={COPY.access} tone="green" /> : null}</div>
											<h3>{course.title}</h3>
											<p className="c-catalog-card__teacher"><IconUsers size={16} /> {teacherName}</p>
											{course.description ? <p className="c-catalog-card__desc">{course.description}</p> : null}
											<div className="c-catalog-card__meta"><span>{STAGES[course.educationalStage] ?? course.educationalStage}</span><span>{videos} {COPY.lecture}</span>{quizzes ? <span>{quizzes} {COPY.quiz}</span> : null}</div>
											<div className="c-catalog-card__foot"><strong dir="ltr">{!course.isPaid || !course.price ? COPY.free : `${formatPounds(course.price)} ${COPY.currency}`}</strong><span>{hasAccess ? COPY.access : COPY.view}</span></div>
										</div>
									</Link></li>
								);
							})}
						</ul>
					)}
				</section>
			) : null}
		</main>
	);

	if (session) {
		return (
			<ClassicShell
				title="الكورسات والمدرسين"
				balanceLabel={wallet ? money(wallet.balancePiastres) : "0 جنيه"}
				unreadCount={notifications?.unreadCount ?? 0}
			>
				<div className="c-catalog" style={{ padding: 0 }}>
					{content}
				</div>
			</ClassicShell>
		);
	}

	return (
		<div className="c-pub c-catalog" dir="rtl">
			<PublicHeader signedIn={false} />
			{content}
			<SiteFooter />
		</div>
	);
}

function FilterRow({ label, allLabel, allHref, allActive, items }: { label: string; allLabel: string; allHref: string; allActive: boolean; items: Array<{ key: string; label: string; href: string; active: boolean }> }) {
	if (!items.length) return null;
	return (
		<div className="c-filter-row"><strong>{label}</strong><div><Link href={allHref} data-active={allActive}>{allLabel}</Link>{items.map((item) => <Link key={item.key} href={item.href} data-active={item.active}>{item.label}</Link>)}</div></div>
	);
}

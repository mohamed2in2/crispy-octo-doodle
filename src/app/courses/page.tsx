import Link from "next/link";

import { PublicHeader } from "@/components/classic/PublicHeader";
import { SiteFooter } from "@/components/classic/SiteFooter";
import { Badge, Band, Empty, LinkButton } from "@/components/classic/pieces";
import { IconBook, IconSearch, IconUsers } from "@/components/classic/icons";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import "@/styles/classic-tokens.css";
import "@/styles/classic-components.css";
import "@/styles/classic-landing.css";
import "@/styles/classic-courses.css";

export const dynamic = "force-dynamic";

const COPY = {
	title: "\u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a",
	lead: "\u0627\u062e\u062a\u0627\u0631 \u0627\u0644\u0645\u0627\u062f\u0629 \u0623\u0648 \u0627\u0644\u0645\u062f\u0631\u0633\u060c \u0648\u0627\u0639\u0631\u0641 \u0627\u0644\u0633\u0639\u0631 \u0648\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0643\u0648\u0631\u0633 \u0642\u0628\u0644 \u0645\u0627 \u062a\u0634\u062a\u0631\u0643.",
	search: "\u0627\u0628\u062d\u062b \u0628\u0627\u0633\u0645 \u0627\u0644\u0643\u0648\u0631\u0633 \u0623\u0648 \u0627\u0644\u0645\u0627\u062f\u0629",
	searchButton: "\u0628\u062d\u062b",
	filters: "\u0627\u062e\u062a\u0627\u0631\u0627\u062a \u0627\u0644\u0628\u062d\u062b",
	all: "\u0627\u0644\u0643\u0644",
	subject: "\u0627\u0644\u0645\u0627\u062f\u0629",
	teacher: "\u0627\u0644\u0645\u062f\u0631\u0633",
	stage: "\u0627\u0644\u0645\u0631\u062d\u0644\u0629",
	results: "\u0643\u0648\u0631\u0633 \u0645\u062a\u0627\u062d",
	lecture: "\u0645\u062d\u0627\u0636\u0631\u0629",
	quiz: "\u0627\u062e\u062a\u0628\u0627\u0631",
	free: "\u0645\u062c\u0627\u0646\u064a",
	currency: "\u062c\u0646\u064a\u0647",
	access: "\u0645\u0636\u0627\u0641 \u0644\u0645\u0643\u062a\u0628\u062a\u0643",
	view: "\u0634\u0648\u0641 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
	empty: "\u0645\u0641\u064a\u0634 \u0643\u0648\u0631\u0633\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629",
	emptyText: "\u063a\u064a\u0651\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0628\u062d\u062b \u0623\u0648 \u0627\u0645\u0633\u062d \u0628\u0639\u0636 \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631\u0627\u062a.",
	unavailable: "\u0645\u0634 \u0642\u0627\u062f\u0631\u064a\u0646 \u0646\u062d\u0645\u0644 \u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a \u062f\u0644\u0648\u0642\u062a\u064a. \u062c\u0631\u0628 \u062a\u0627\u0646\u064a \u0628\u0639\u062f \u0634\u0648\u064a\u0629.",
	clear: "\u0645\u0633\u062d \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631\u0627\u062a",
} as const;

const STAGES: Record<string, string> = {
	sec_1: "\u0623\u0648\u0644\u0649 \u0628\u0643\u0627\u0644\u0648\u0631\u064a\u0627",
	sec_2: "\u062b\u0627\u0646\u064a\u0629 \u0628\u0643\u0627\u0644\u0648\u0631\u064a\u0627",
};

type SearchValue = string | string[] | undefined;
type CourseSearch = Record<string, SearchValue>;

function one(value: SearchValue): string {
	return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function safeImage(value: string | null): string | null {
	if (!value) return null;
	if (/^https?:\/\//i.test(value) || value.startsWith("data:image/") || value.startsWith("/")) return value;
	return null;
}

function formatPounds(value: number): string {
	return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function hrefWith(current: { q: string; subject: string; teacher: string; stage: string }, patch: Partial<typeof current>) {
	const next = { ...current, ...patch };
	const params = new URLSearchParams();
	if (next.q) params.set("q", next.q);
	if (next.subject) params.set("subject", next.subject);
	if (next.teacher) params.set("teacher", next.teacher);
	if (next.stage) params.set("stage", next.stage);
	const query = params.toString();
	return query ? `/courses?${query}` : "/courses";
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<CourseSearch> }) {
	const raw = await searchParams;
	const selected = {
		q: one(raw.q).trim(),
		subject: one(raw.subject).trim(),
		teacher: one(raw.teacher).trim(),
		stage: one(raw.stage).trim(),
	};
	const session = await getSession();

	let unavailable = false;
	let courses: Awaited<ReturnType<typeof prisma.course.findMany>> = [];
	let teacherOptions: Array<{ id: string; name: string }> = [];

	try {
		const [courseRows, teacherRows] = await Promise.all([
			prisma.course.findMany({
				where: {
					teacher: { isDeleted: false },
					...(selected.subject ? { subject: selected.subject } : {}),
					...(selected.teacher ? { teacherId: selected.teacher } : {}),
					...(selected.stage ? { educationalStage: selected.stage } : {}),
					...(selected.q
						? {
							OR: [
								{ title: { contains: selected.q, mode: "insensitive" as const } },
								{ subject: { contains: selected.q, mode: "insensitive" as const } },
								{ description: { contains: selected.q, mode: "insensitive" as const } },
							],
						}
						: {}),
				},
				orderBy: { createdAt: "desc" },
				take: 100,
				include: {
					teacher: {
						select: {
							id: true,
							name: true,
							teacherProfile: { select: { displayName: true, photoUrl: true } },
						},
					},
					folders: { select: { _count: { select: { videos: true, quizzes: true } } } },
				},
			}),
			prisma.user.findMany({
				where: { role: "teacher", isDeleted: false, courses: { some: {} } },
				orderBy: { name: "asc" },
				select: { id: true, name: true, teacherProfile: { select: { displayName: true } } },
			}),
		]);
		courses = courseRows;
		teacherOptions = teacherRows.map((teacher) => ({
			id: teacher.id,
			name: teacher.teacherProfile?.displayName ?? teacher.name,
		}));
	} catch {
		unavailable = true;
	}

	const access = new Set<string>();
	if (!unavailable && session?.role === "student" && courses.length > 0) {
		try {
			const rows = await prisma.accessCode.findMany({
				where: { studentId: session.id, courseId: { in: courses.map((course) => course.id) } },
				select: { courseId: true },
			});
			rows.forEach((row) => access.add(row.courseId));
		} catch {
			// Catalogue stays available if only the personal access lookup fails.
		}
	}

	let allSubjects: string[] = [];
	let allStages: string[] = [];
	try {
		const options = await prisma.course.findMany({
			where: { teacher: { isDeleted: false } },
			select: { subject: true, educationalStage: true },
			distinct: ["subject", "educationalStage"],
		});
		allSubjects = Array.from(new Set(options.map((item) => item.subject).filter(Boolean))).sort();
		allStages = Array.from(new Set(options.map((item) => item.educationalStage).filter(Boolean))).sort();
	} catch {
		// The main query already controls the visible unavailable state.
	}

	const hasFilters = Boolean(selected.q || selected.subject || selected.teacher || selected.stage);

	return (
		<div className="c-pub c-catalog" dir="rtl">
			<PublicHeader signedIn={Boolean(session)} />
			<main className="c-catalog__inner">
				<header className="c-catalog__hero">
					<div>
						<span className="c-catalog__kicker">Code-UP</span>
						<h1>{COPY.title}</h1>
						<p>{COPY.lead}</p>
					</div>
					<form className="c-catalog__search" action="/courses" method="get" role="search">
						<span aria-hidden="true"><IconSearch /></span>
						<input name="q" type="search" defaultValue={selected.q} placeholder={COPY.search} aria-label={COPY.search} />
						{selected.subject ? <input type="hidden" name="subject" value={selected.subject} /> : null}
						{selected.teacher ? <input type="hidden" name="teacher" value={selected.teacher} /> : null}
						{selected.stage ? <input type="hidden" name="stage" value={selected.stage} /> : null}
						<button type="submit">{COPY.searchButton}</button>
					</form>
				</header>

				{unavailable ? <Band tone="warning" text={COPY.unavailable} /> : null}

				{!unavailable ? (
					<section className="c-catalog__filters" aria-labelledby="catalog-filters">
						<div className="c-catalog__filters-head">
							<h2 id="catalog-filters">{COPY.filters}</h2>
							{hasFilters ? <Link href="/courses">{COPY.clear}</Link> : null}
						</div>

						{allSubjects.length > 0 ? (
							<div className="c-filter-row">
								<strong>{COPY.subject}</strong>
								<div>
									<Link href={hrefWith(selected, { subject: "" })} data-active={!selected.subject}>{COPY.all}</Link>
									{allSubjects.map((subject) => <Link key={subject} href={hrefWith(selected, { subject })} data-active={selected.subject === subject}>{subject}</Link>)}
								</div>
							</div>
						) : null}

						{teacherOptions.length > 0 ? (
							<div className="c-filter-row">
								<strong>{COPY.teacher}</strong>
								<div>
									<Link href={hrefWith(selected, { teacher: "" })} data-active={!selected.teacher}>{COPY.all}</Link>
									{teacherOptions.map((teacher) => <Link key={teacher.id} href={hrefWith(selected, { teacher: teacher.id })} data-active={selected.teacher === teacher.id}>{teacher.name}</Link>)}
								</div>
							</div>
						) : null}

						{allStages.length > 0 ? (
							<div className="c-filter-row">
								<strong>{COPY.stage}</strong>
								<div>
									<Link href={hrefWith(selected, { stage: "" })} data-active={!selected.stage}>{COPY.all}</Link>
									{allStages.map((stage) => <Link key={stage} href={hrefWith(selected, { stage })} data-active={selected.stage === stage}>{STAGES[stage] ?? stage}</Link>)}
								</div>
							</div>
						) : null}
					</section>
				) : null}

				{!unavailable ? (
					<section className="c-catalog__results">
						<div className="c-catalog__results-head">
							<h2>{COPY.title}</h2>
							<span dir="ltr">{courses.length} <bdi>{COPY.results}</bdi></span>
						</div>
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
										<li key={course.id}>
											<Link className="c-catalog-card" href={`/courses/${course.slug ?? course.id}`}>
												{thumb ? <img className="c-catalog-card__thumb" src={thumb} alt="" /> : <span className="c-catalog-card__thumb c-catalog-card__thumb--empty" aria-hidden="true"><IconBook size={34} /></span>}
												<div className="c-catalog-card__body">
													<div className="c-catalog-card__badges">
														<Badge label={course.subject} tone="blue" />
														{hasAccess ? <Badge label={COPY.access} tone="green" /> : null}
													</div>
													<h3>{course.title}</h3>
													<p className="c-catalog-card__teacher"><IconUsers size={16} /> {teacherName}</p>
													{course.description ? <p className="c-catalog-card__desc">{course.description}</p> : null}
													<div className="c-catalog-card__meta">
														<span>{STAGES[course.educationalStage] ?? course.educationalStage}</span>
														<span>{videos} {COPY.lecture}</span>
														{quizzes > 0 ? <span>{quizzes} {COPY.quiz}</span> : null}
													</div>
													<div className="c-catalog-card__foot">
														<strong dir="ltr">{!course.isPaid || !course.price ? COPY.free : `${formatPounds(course.price)} ${COPY.currency}`}</strong>
														<span>{hasAccess ? COPY.access : COPY.view}</span>
													</div>
												</div>
											</Link>
										</li>
									);
								})}
							</ul>
						)}
					</section>
				) : null}
			</main>
			<SiteFooter />
		</div>
	);
}

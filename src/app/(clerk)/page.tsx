import Link from "next/link";
import { redirect } from "next/navigation";

import { LANDING } from "@/components/classic/landing-copy";
import { PublicHeader } from "@/components/classic/PublicHeader";
import { SiteFooter } from "@/components/classic/SiteFooter";
import {
	IconBook,
	IconSparkle,
	IconUsers,
	IconWallet,
} from "@/components/classic/icons";
import {
	Badge,
	Band,
	Card,
	Empty,
	LinkButton,
	Section,
} from "@/components/classic/pieces";
import { getSession } from "@/lib/auth";
import { getLandingData, type LandingTeacher } from "@/lib/classic/landing-data";

import "@/styles/classic-tokens.css";
import "@/styles/classic-components.css";
import "@/styles/classic-landing.css";

/*
 * The public main page.
 *
 * Two jobs, in this order:
 *
 *   1. Route by session. A signed-in student has no use for a marketing page
 *      and should never have to find the way back into their own account, so
 *      they are redirected to /account/home. Everyone else sees the landing.
 *   2. Show the two things a visitor actually came to check: which teachers
 *      are here (with their faces) and what is available to study.
 *
 * The redirect is deliberately server-side. Doing it in a client effect shows
 * the landing for one frame first, which is what makes an app feel like it
 * forgot who you are.
 *
 * Layout notes, all of them fixes for things the previous version got wrong:
 *
 *   - There is a header now. Before, a visitor landed on a bare hero with no
 *     logo and no way to log in.
 *   - The hero has one filled button and one quiet link. Before it had two
 *     identical full-width outlined boxes, which read as empty text fields.
 *   - Teachers and courses scroll in rails rather than filling a four-column
 *     grid. With one course in the catalogue a grid leaves a screen-wide hole
 *     and an orphaned last row; a rail with three items looks deliberate.
 *   - Nothing advertises emptiness. A teacher with no published courses says
 *     nothing rather than "0 courses", and a price only appears when booking
 *     is actually open.
 *   - There is an answer to "why should I trust you" above the catalogue, and
 *     a subject rail below it. A visitor who sees one course card and nothing
 *     else concludes the platform is empty; the subjects say what is taught
 *     here even when few courses are published yet.
 */

// Reads the auth cookie, so it can never be statically rendered.
export const dynamic = "force-dynamic";

/*
 * Page-local copy, kept next to the markup that uses it for the same reason
 * BOOKING_COPY lives in the teacher page: a string used in exactly one place
 * is easier to review here than in a shared dictionary.
 */
const EXTRA = {
	// ليه Code-UP؟
	whyTitle: "\u0644\u064a\u0647 Code-UP\u061f",
	// المواد المتاحة
	subjectsTitle: "\u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u0645\u062a\u0627\u062d\u0629",
} as const;

/*
 * Three claims, each one checkable on the site itself. No "best platform in
 * Egypt" line: an unverifiable boast is the fastest way to read as generated
 * marketing filler.
 */
const WHY = [
	{
		key: "teachers",
		// مدرسين موثوقين
		name: "\u0645\u062f\u0631\u0633\u064a\u0646 \u0645\u0648\u062b\u0648\u0642\u064a\u0646",
		// كل مدرس ليه صفحة وكورسات وأسعار واضحة قبل إنك تدفع.
		text: "\u0643\u0644 \u0645\u062f\u0631\u0633 \u0644\u064a\u0647 \u0635\u0641\u062d\u0629 \u0648\u0643\u0648\u0631\u0633\u0627\u062a \u0648\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0636\u062d\u0629 \u0642\u0628\u0644 \u0625\u0646\u0643 \u062a\u062f\u0641\u0639.",
	},
	{
		key: "wallet",
		// محفظة واحدة لكل حاجة
		name: "\u0645\u062d\u0641\u0638\u0629 \u0648\u0627\u062d\u062f\u0629 \u0644\u0643\u0644 \u062d\u0627\u062c\u0629",
		// اشحن رصيدك مرة، واشترك في أي كورس، وكل عملية ليها فاتورة.
		text: "\u0627\u0634\u062d\u0646 \u0631\u0635\u064a\u062f\u0643 \u0645\u0631\u0629\u060c \u0648\u0627\u0634\u062a\u0631\u0643 \u0641\u064a \u0623\u064a \u0643\u0648\u0631\u0633\u060c \u0648\u0643\u0644 \u0639\u0645\u0644\u064a\u0629 \u0644\u064a\u0647\u0627 \u0641\u0627\u062a\u0648\u0631\u0629.",
	},
	{
		key: "ai",
		// مساعد ذكي معاك
		name: "\u0645\u0633\u0627\u0639\u062f \u0630\u0643\u064a \u0645\u0639\u0627\u0643",
		// يشرح اللي مش فاهمه ويعملك خطة مذاكرة من نتايجك.
		text: "\u064a\u0634\u0631\u062d \u0627\u0644\u0644\u064a \u0645\u0634 \u0641\u0627\u0647\u0645\u0647 \u0648\u064a\u0639\u0645\u0644\u0643 \u062e\u0637\u0629 \u0645\u0630\u0627\u0643\u0631\u0629 \u0645\u0646 \u0646\u062a\u0627\u064a\u062c\u0643.",
	},
] as const;

function whyIcon(key: (typeof WHY)[number]["key"]) {
	if (key === "teachers") return <IconUsers />;
	if (key === "wallet") return <IconWallet />;
	return <IconSparkle />;
}

function formatPounds(value: number): string {
	// Western digits, matching every other money surface in the classic layer.
	return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
		value,
	);
}

/**
 * Turns the booking decision into a chip.
 *
 * The chip is never absent: "we are not telling you whether you can join" is
 * worse than "booking is closed". A closed profile still earns a neutral chip
 * because the student can usually still buy the teacher's courses one by one.
 */
function bookingChip(teacher: LandingTeacher): {
	label: string;
	tone: "neutral" | "green" | "amber" | "blue";
} {
	switch (teacher.booking.kind) {
		case "open":
			return { label: LANDING.bookOpen, tone: "green" };
		case "upcoming":
			return { label: LANDING.bookUpcoming, tone: "blue" };
		case "late":
			return { label: LANDING.bookLate, tone: "amber" };
		case "contact":
			return { label: LANDING.bookContact, tone: "blue" };
		default:
			return { label: LANDING.bookClosed, tone: "neutral" };
	}
}

function priceLine(teacher: LandingTeacher): string | null {
	const state = teacher.booking;
	if (
		state.kind === "closed" ||
		state.kind === "contact" ||
		state.priceFromPounds === null
	) {
		return null;
	}
	return `${LANDING.priceFrom} ${formatPounds(state.priceFromPounds)} ${LANDING.currency}`;
}

export default async function HomePage() {
	const session = await getSession();
	if (session) redirect("/account/home");

	const { teachers, courses, unavailable } = await getLandingData();

	/*
	 * Subjects come from the catalogue rather than a hardcoded list, so the
	 * rail can never advertise a subject nobody teaches. One subject is not a
	 * choice, so the rail only earns its space from two upwards.
	 */
	const subjects = Array.from(
		new Set(courses.map((course) => course.subject).filter(Boolean)),
	) as string[];

	return (
		<div className="c-pub" dir="rtl">
			<PublicHeader />

			<main className="c-pub__inner">
				{/*
				 * Hero. Text on one side, a flat geometric panel on the other.
				 * The panel is drawn in CSS rather than shipped as an
				 * illustration: a stock vector of cartoon students is both a
				 * 200KB download and the most interchangeable asset in this
				 * market.
				 */}
				<section className="c-hero">
					<div className="c-hero__text">
						<span className="c-hero__kicker">{LANDING.heroKicker}</span>
						<h1 className="c-hero__title">{LANDING.heroTitle}</h1>
						<p className="c-hero__lead">{LANDING.heroText}</p>

						<div className="c-hero__actions">
							<LinkButton href="/signup" label={LANDING.startFree} inline />
							<Link className="c-hero__alt" href="/courses">
								{LANDING.courses}
							</Link>
						</div>

						{/* Only real counts. A zero here would be an argument against us. */}
						{teachers.length > 0 || courses.length > 0 ? (
							<dl className="c-hero__stats">
								{teachers.length > 0 ? (
									<div className="c-hero__stat">
										<dt>{LANDING.teachers}</dt>
										<dd dir="ltr">{teachers.length}</dd>
									</div>
								) : null}
								{courses.length > 0 ? (
									<div className="c-hero__stat">
										<dt>{LANDING.courses}</dt>
										<dd dir="ltr">{courses.length}</dd>
									</div>
								) : null}
							</dl>
						) : null}
					</div>

					<div className="c-hero__art" aria-hidden="true">
						<span className="c-hero__art-bar" data-i="1" />
						<span className="c-hero__art-bar" data-i="2" />
						<span className="c-hero__art-bar" data-i="3" />
						<span className="c-hero__art-dot" />
					</div>
				</section>

				{unavailable ? <Band tone="warning" text={LANDING.unavailable} /> : null}

				{/*
				 * Why us, before the catalogue. A visitor decides whether to keep
				 * reading in the first screen and a half, and "here are some cards"
				 * is not an argument.
				 */}
				<section className="c-why">
					<h2 className="c-why__title">{EXTRA.whyTitle}</h2>
					<ul className="c-why__grid">
						{WHY.map((item) => (
							<li className="c-why__item" key={item.key}>
								<span className="c-why__icon" aria-hidden="true">
									{whyIcon(item.key)}
								</span>
								<h3 className="c-why__name">{item.name}</h3>
								<p className="c-why__text">{item.text}</p>
							</li>
						))}
					</ul>
				</section>

				<Section title={LANDING.teachers} moreHref="/courses">
					{teachers.length === 0 ? (
						<Card>
							<Empty
								icon={<IconUsers />}
								title={LANDING.noTeachers}
								text={LANDING.noTeachersWhy}
								action={
									<LinkButton href="/courses" label={LANDING.courses} inline />
								}
							/>
						</Card>
					) : (
						<ul className="c-rail">
							{teachers.map((teacher) => {
								const chip = bookingChip(teacher);
								const price = priceLine(teacher);
								return (
									<li className="c-rail__cell" key={teacher.slug}>
										<Link className="c-teacher" href={`/${teacher.slug}`}>
											{teacher.photoUrl ? (
												/* eslint-disable-next-line @next/next/no-img-element */
												<img
													alt={teacher.name}
													className="c-teacher__photo"
													src={teacher.photoUrl}
												/>
											) : (
												<span aria-hidden className="c-teacher__initial">
													{teacher.name.slice(0, 1)}
												</span>
											)}

											<h3 className="c-teacher__name">{teacher.name}</h3>

											{teacher.bio ? (
												<p className="c-teacher__bio">{teacher.bio}</p>
											) : null}

											{/* Silence beats "0 كورس". */}
											{teacher.courseCount > 0 ? (
												<span className="c-teacher__meta">
													{teacher.courseCount} {LANDING.course}
												</span>
											) : null}

											<span className="c-teacher__foot">
												<Badge label={chip.label} tone={chip.tone} />
											</span>
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</Section>

				<Section title={LANDING.courses} moreHref="/courses">
					{courses.length === 0 ? (
						<Card>
							<Empty
								icon={<IconBook />}
								title={LANDING.noCourses}
								text={LANDING.noCoursesWhy}
							/>
						</Card>
					) : (
						<ul className="c-rail">
							{courses.map((course) => (
								<li className="c-rail__cell" key={course.href}>
									<Link className="c-course" href={course.href}>
										{course.thumbnailUrl ? (
											/* eslint-disable-next-line @next/next/no-img-element */
											<img
												alt={course.title}
												className="c-course__thumb"
												src={course.thumbnailUrl}
											/>
										) : (
											<span
												aria-hidden
												className="c-course__thumb c-course__thumb--empty"
											>
												<IconBook size={30} />
											</span>
										)}
										<div className="c-course__body">
											<h3 className="c-course__title">{course.title}</h3>
											<span className="c-course__meta">
												{course.subject ? <span>{course.subject}</span> : null}
												<span>
													{LANDING.stageLabels[course.stage] ?? course.stage}
												</span>
											</span>
											<div className="c-course__foot">
												<span className="c-course__meta">
													{course.lectureCount} {LANDING.lecture}
												</span>
												<span className="c-course__price" dir="ltr">
													{!course.isPaid
														? LANDING.free
														: `${formatPounds(course.pricePounds ?? 0)} ${LANDING.currency}`}
												</span>
											</div>
										</div>
									</Link>
								</li>
							))}
						</ul>
					)}
				</Section>

				{/*
				 * Subjects. Cheap to render, and it answers the question a thin
				 * catalogue raises: "is anything actually taught here?"
				 */}
				{subjects.length > 1 ? (
					<section className="c-subjects">
						<h2 className="c-subjects__title">{EXTRA.subjectsTitle}</h2>
						<ul className="c-subjects__list">
							{subjects.map((subject) => (
								<li key={subject}>
									<Link className="c-subject" href="/courses">
										{subject}
									</Link>
								</li>
							))}
						</ul>
					</section>
				) : null}

				{/* The one thing the competition does not have, stated plainly. */}
				<Card
					title={LANDING.aiTitle}
					description={LANDING.aiText}
					icon={<IconSparkle />}
					footer={
						<LinkButton
							href="/signup"
							label={LANDING.startFree}
							variant="quiet"
							inline
						/>
					}
				/>

				{/*
				 * How it works. Big numerals in their own tinted squares rather
				 * than a bulleted list: the steps are the reassurance, so they get
				 * the space.
				 */}
				<section className="c-how">
					<div className="c-how__head">
						<h2 className="c-how__title">{LANDING.howTitle}</h2>
						<p className="c-how__lead">{LANDING.howLead}</p>
					</div>
					<ol className="c-how__grid">
						{LANDING.howSteps.map((step, index) => (
							<li className="c-how__step" key={step}>
								<span className="c-how__num" aria-hidden="true">
									{index + 1}
								</span>
								<p className="c-how__text">{step}</p>
							</li>
						))}
					</ol>
				</section>
			</main>

			<SiteFooter />
		</div>
	);
}

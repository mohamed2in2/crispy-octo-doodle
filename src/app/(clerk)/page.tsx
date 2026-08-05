import Link from "next/link";
import { redirect } from "next/navigation";

import { LANDING } from "@/components/classic/landing-copy";
import { PublicHeader } from "@/components/classic/PublicHeader";
import { SiteFooter } from "@/components/classic/SiteFooter";
import {
	IconBook,
	IconSparkle,
	IconUsers,
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
 */

// Reads the auth cookie, so it can never be statically rendered.
export const dynamic = "force-dynamic";

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
												{price ? (
													<span className="c-teacher__price" dir="ltr">
														{price}
													</span>
												) : null}
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

				{/* Teachers are the supply side; the page should recruit them too. */}
				<section className="c-join">
					<div>
						<h2 className="c-join__title">{LANDING.joinTitle}</h2>
						<p className="c-join__text">{LANDING.joinText}</p>
					</div>
					<LinkButton href="/signup" label={LANDING.joinCta} inline />
				</section>
			</main>

			<SiteFooter />
		</div>
	);
}

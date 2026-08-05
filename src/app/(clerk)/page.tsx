import Link from "next/link";
import { redirect } from "next/navigation";

import { LANDING } from "@/components/classic/landing-copy";
import { IconBook, IconUsers } from "@/components/classic/icons";
import {
	Badge,
	Band,
	Card,
	Empty,
	LinkButton,
	Section,
	Steps,
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
		<main className="c-pub" dir="rtl">
			<div className="c-pub__inner">
				<section className="c-hero">
					<h1 className="c-hero__title">{LANDING.heroTitle}</h1>
					<p className="c-hero__text">{LANDING.heroText}</p>
					<div className="c-hero__actions">
						<LinkButton href="/signup" label={LANDING.signUp} />
						<LinkButton href="/login" label={LANDING.logIn} variant="quiet" />
					</div>
				</section>

				{unavailable ? <Band tone="warning" text={LANDING.unavailable} /> : null}

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
						<div className="c-teachers">
							{teachers.map((teacher) => {
								const chip = bookingChip(teacher);
								const price = priceLine(teacher);
								return (
									<Link
										className="c-teacher"
										href={`/${teacher.slug}`}
										key={teacher.slug}
									>
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
										<span className="c-teacher__meta">
											{teacher.courseCount} {LANDING.course}
										</span>
										<Badge label={chip.label} tone={chip.tone} />
										{price ? (
											<span className="c-course__price" dir="ltr">
												{price}
											</span>
										) : null}
									</Link>
								);
							})}
						</div>
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
						<div className="c-courses">
							{courses.map((course) => (
								<Link className="c-course" href={course.href} key={course.href}>
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
							))}
						</div>
					)}
				</Section>

				<Card title={LANDING.howTitle}>
					<Steps steps={[...LANDING.howSteps]} />
				</Card>
			</div>
		</main>
	);
}

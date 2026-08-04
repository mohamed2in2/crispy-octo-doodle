import { prisma } from "@/lib/prisma";

import { bookingAvailability, type BookingAvailability } from "./booking";

/*
 * Data for the public main page.
 *
 * Reads the database directly rather than going through an HTTP route,
 * because this page renders for logged-out visitors and there is no session
 * to forward. Everything selected here is public information that already
 * appears on a published teacher page.
 *
 * A database failure returns empty lists with unavailable: true. It must not
 * throw: the main page is the one screen that has to render for someone who
 * has never signed in, and a stack trace is a worse first impression than a
 * quiet notice.
 */

export type LandingTeacher = {
	slug: string;
	name: string;
	photoUrl: string | null;
	bio: string | null;
	courseCount: number;
	booking: BookingAvailability;
};

export type LandingCourse = {
	href: string;
	title: string;
	subject: string | null;
	stage: string;
	thumbnailUrl: string | null;
	isPaid: boolean;
	pricePounds: number | null;
	lectureCount: number;
};

export type LandingData = {
	teachers: LandingTeacher[];
	courses: LandingCourse[];
	unavailable: boolean;
};

/**
 * Same guard the teacher page uses. An image URL out of the database is
 * attacker-influenced text, so only absolute http(s), inline data images and
 * same-origin paths are ever put in a src.
 */
function safeImage(value: string | null | undefined): string | null {
	if (!value) return null;
	if (/^https?:\/\//i.test(value)) return value;
	if (value.startsWith("data:image/")) return value;
	if (value.startsWith("/")) return value;
	return null;
}

export async function getLandingData(): Promise<LandingData> {
	try {
		const [profiles, courses] = await Promise.all([
			prisma.teacherProfile.findMany({
				where: { isPublished: true, teacher: { isDeleted: false } },
				// Ordered by slug so the grid is stable between requests. There is
				// no popularity signal on the profile yet; when one exists, order
				// by it here and nothing else has to change.
				orderBy: { slug: "asc" },
				take: 12,
				select: {
					slug: true,
					displayName: true,
					photoUrl: true,
					bio: true,
					isPublished: true,
					priceMonthly: true,
					priceTermly: true,
					priceYearly: true,
					courseStartDate: true,
					bookingContactUrl: true,
					teacher: {
						select: {
							name: true,
							isDeleted: true,
							_count: { select: { courses: true } },
						},
					},
				},
			}),
			prisma.course.findMany({
				orderBy: { createdAt: "desc" },
				take: 8,
				select: {
					id: true,
					slug: true,
					title: true,
					subject: true,
					educationalStage: true,
					thumbnailUrl: true,
					isPaid: true,
					price: true,
					folders: { select: { _count: { select: { videos: true } } } },
				},
			}),
		]);

		return {
			unavailable: false,
			teachers: profiles.map((profile) => ({
				slug: profile.slug,
				name: profile.displayName ?? profile.teacher.name,
				photoUrl: safeImage(profile.photoUrl),
				bio: profile.bio,
				courseCount: profile.teacher._count.courses,
				booking: bookingAvailability({
					isPublished: profile.isPublished,
					teacherDeleted: profile.teacher.isDeleted,
					priceMonthly: profile.priceMonthly,
					priceTermly: profile.priceTermly,
					priceYearly: profile.priceYearly,
					courseStartDate: profile.courseStartDate,
					bookingContactUrl: profile.bookingContactUrl,
				}),
			})),
			courses: courses.map((course) => ({
				// Slug when it has been backfilled, id otherwise. The course route
				// resolves either, so this never produces a dead link.
				href: `/courses/${course.slug ?? course.id}`,
				title: course.title,
				subject: course.subject,
				stage: course.educationalStage,
				thumbnailUrl: safeImage(course.thumbnailUrl),
				isPaid: course.isPaid,
				pricePounds: course.price ?? null,
				lectureCount: course.folders.reduce(
					(total, folder) => total + folder._count.videos,
					0,
				),
			})),
		};
	} catch {
		return { teachers: [], courses: [], unavailable: true };
	}
}

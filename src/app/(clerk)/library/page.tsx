import Link from "next/link";
import { redirect } from "next/navigation";

import { ClassicShell } from "@/components/classic/ClassicShell";
import { SHELL } from "@/components/classic/copy";
import { IconBook, IconPlay, IconHelp } from "@/components/classic/icons";
import {
	Badge,
	Card,
	Empty,
	LinkButton,
	Section,
	Stat,
	Tile,
	Tiles,
} from "@/components/classic/pieces";
import { getSession } from "@/lib/auth";
import { getWalletSummary } from "@/lib/financial/data";
import { piastresToPounds } from "@/lib/financial/money";
import { getNotifications } from "@/lib/notifications/data";
import { prisma } from "@/lib/prisma";

import "@/styles/classic-tokens.css";
import "@/styles/classic-shell.css";
import "@/styles/classic-components.css";

export const dynamic = "force-dynamic";

function formatPounds(piastres: number): string {
	const pounds = piastresToPounds(piastres);
	const formatted = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
	}).format(pounds);
	return `${formatted} ${SHELL.currency}`;
}

export default async function LibraryPage() {
	const session = await getSession();
	if (!session) {
		redirect("/login?redirect_url=/library");
	}

	const [wallet, notifications, accessCodes] = await Promise.all([
		getWalletSummary(),
		getNotifications(),
		prisma.accessCode.findMany({
			where: { studentId: session.id },
			include: {
				course: {
					include: {
						teacher: {
							select: {
								id: true,
								name: true,
								teacherProfile: { select: { displayName: true } },
							},
						},
						folders: {
							select: {
								_count: { select: { videos: true, quizzes: true } },
							},
						},
					},
				},
			},
			orderBy: { createdAt: "desc" },
		}),
	]);

	const balanceLabel = formatPounds(wallet.balancePiastres);
	const enrolledCourses = accessCodes.map((ac) => ac.course).filter(Boolean);

	return (
		<ClassicShell
			title={SHELL.myCourses}
			balanceLabel={balanceLabel}
			unreadCount={notifications.unreadCount}
		>
			<Card
				title={`مرحباً، ${session.name ?? "طالب"}! 👋`}
				description="تابع رحلتك التعليمية وشاهد المحاضرات والدروس في الكورسات المشترك فيها."
				icon={<IconBook size={26} />}
			>
				<Stat
					label="عدد الكورسات والمسارات المشترك فيها"
					value={`${enrolledCourses.length} كورس`}
					plain
				/>
			</Card>

			<Section title="كورساتك الحالية">
				{enrolledCourses.length === 0 ? (
					<Card>
						<Empty
							icon={<IconBook />}
							title="مكتبتك فارغة حالياً"
							text="لم تشترك في أي كورس بعد. اشترك في الكورسات لتظهر هنا وتتمكن من متابعتها في أي وقت."
							action={
								<LinkButton
									href="/courses"
									label="تصفح الكورسات الآن"
									inline
								/>
							}
						/>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" dir="rtl">
						{enrolledCourses.map((course) => {
							const teacherName =
								course.teacher?.teacherProfile?.displayName ??
								course.teacher?.name ??
								"المدرس";
							const videoCount = course.folders.reduce(
								(acc, f) => acc + f._count.videos,
								0,
							);
							const quizCount = course.folders.reduce(
								(acc, f) => acc + f._count.quizzes,
								0,
							);

							return (
								<Card
									key={course.id}
									title={course.title}
									description={`${course.subject} · ${teacherName}`}
									icon={<IconBook />}
									footer={
										<LinkButton
											href={`/courses/${course.id}`}
											label="متابعة الدراسة ➔"
											variant="primary"
											inline
										/>
									}
								>
									<div className="flex items-center gap-2 flex-wrap mb-2">
										<Badge label={`${videoCount} محاضرة`} tone="blue" />
										{quizCount > 0 ? (
											<Badge label={`${quizCount} اختبار`} tone="amber" />
										) : null}
										<Badge label="كورس نشط" tone="green" />
									</div>
								</Card>
							);
						})}
					</div>
				)}
			</Section>
		</ClassicShell>
	);
}

/*
 * Copy for the main page, in \u escapes for the reason given in ./copy.ts.
 *
 * The voice is deliberately the spoken Egyptian the students actually use
 * rather than formal written Arabic. Formal phrasing on a study platform reads
 * as a bank letter, and a bank letter is exactly the wrong feeling for a
 * teenager deciding whether to trust a page with their pocket money.
 */

export const HOME = {
	/* الرصيد الحالي في حسابك */
	balanceLabel:
		"\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a \u0641\u064a \u062d\u0633\u0627\u0628\u0643",
	/* قيد التأكيد */
	pending: "\u0642\u064a\u062f \u0627\u0644\u062a\u0623\u0643\u064a\u062f",
	/* شحن الرصيد */
	topUpAction: "\u0634\u062d\u0646 \u0627\u0644\u0631\u0635\u064a\u062f",
	/* شحن المحفظة */
	topUpTitle: "\u0634\u062d\u0646 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
	/* اشحن رصيدك عشان تشترك في الكورسات. */
	topUpDesc:
		"\u0627\u0634\u062d\u0646 \u0631\u0635\u064a\u062f\u0643 \u0639\u0634\u0627\u0646 \u062a\u0634\u062a\u0631\u0643 \u0641\u064a \u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a.",

	/*
	 * The four top-up steps. Printed on the page before the student commits,
	 * because the single most common support question on any kiosk payment flow
	 * is "I paid, where is my money" — and the answer has to be on screen
	 * before they pay, not after.
	 */
	topUpSteps: [
		/* اختار المبلغ اللي عايز تشحنه. */
		"\u0627\u062e\u062a\u0627\u0631 \u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0644\u064a \u0639\u0627\u064a\u0632 \u062a\u0634\u062d\u0646\u0647.",
		/* هنطلع لك كود دفع فوري. */
		"\u0647\u0646\u0637\u0644\u0639 \u0644\u0643 \u0643\u0648\u062f \u062f\u0641\u0639 \u0641\u0648\u0631\u064a.",
		/* ادفع الكود من أي منفذ فوري. */
		"\u0627\u062f\u0641\u0639 \u0627\u0644\u0643\u0648\u062f \u0645\u0646 \u0623\u064a \u0645\u0646\u0641\u0630 \u0641\u0648\u0631\u064a.",
		/* الرصيد هيزيد أوتوماتيك وهنبعت لك إشعار. */
		"\u0627\u0644\u0631\u0635\u064a\u062f \u0647\u064a\u0632\u064a\u062f \u0623\u0648\u062a\u0648\u0645\u0627\u062a\u064a\u0643 \u0648\u0647\u0646\u0628\u0639\u062a \u0644\u0643 \u0625\u0634\u0639\u0627\u0631.",
	],

	/* الوصول السريع */
	quickAccess:
		"\u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0633\u0631\u064a\u0639",
	/* اختار الكورس وابدأ المذاكرة. */
	coursesDesc:
		"\u0627\u062e\u062a\u0627\u0631 \u0627\u0644\u0643\u0648\u0631\u0633 \u0648\u0627\u0628\u062f\u0623 \u0627\u0644\u0645\u0630\u0627\u0643\u0631\u0629.",
	/* حل أسئلة على أي درس. */
	quizzesDesc:
		"\u062d\u0644 \u0623\u0633\u0626\u0644\u0629 \u0639\u0644\u0649 \u0623\u064a \u062f\u0631\u0633.",
	/* الواجبات */
	homeworks: "\u0627\u0644\u0648\u0627\u062c\u0628\u0627\u062a",
	/* شوف واجباتك اللي لازم تخلصها. */
	homeworksDesc:
		"\u0634\u0648\u0641 \u0648\u0627\u062c\u0628\u0627\u062a\u0643 \u0627\u0644\u0644\u064a \u0644\u0627\u0632\u0645 \u062a\u062e\u0644\u0635\u0647\u0627.",
	/* الترتيب */
	leaderboard: "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",
	/* شوف ترتيبك بين الطلبة. */
	leaderboardDesc:
		"\u0634\u0648\u0641 \u062a\u0631\u062a\u064a\u0628\u0643 \u0628\u064a\u0646 \u0627\u0644\u0637\u0644\u0628\u0629.",

	/* لا توجد إشعارات */
	noNotifications:
		"\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0634\u0639\u0627\u0631\u0627\u062a",
	/* أول ما يحصل حاجة مهمة في حسابك هتلاقيها هنا. */
	noNotificationsWhy:
		"\u0623\u0648\u0644 \u0645\u0627 \u064a\u062d\u0635\u0644 \u062d\u0627\u062c\u0629 \u0645\u0647\u0645\u0629 \u0641\u064a \u062d\u0633\u0627\u0628\u0643 \u0647\u062a\u0644\u0627\u0642\u064a\u0647\u0627 \u0647\u0646\u0627.",
	/* ابدأ الآن — اختر كورسك وابدأ رحلة التعلم مع أفضل المدرسين 🚀 */
	unavailable:
		"\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646 \u2014 \u0627\u062e\u062a\u0627\u0631 \u0643\u0648\u0631\u0633\u0643 \u0648\u0627\u0628\u062f\u0623 \u0631\u062d\u0644\u0629 \u0627\u0644\u062a\u0639\u0644\u0645 \u0645\u0639 \u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u062f\u0631\u0633\u064a\u0646 🚀",
} as const;

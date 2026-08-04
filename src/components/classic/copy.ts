/*
 * Every Arabic string in the classic shell.
 *
 * Written as \u escapes with the intended word in a trailing comment. This is
 * not paranoia: a hand-typed word for "wallet" was once silently corrupted —
 * one letter swapped for a near-identical one — and the wrong spelling was
 * written into a balance-ledger note where nobody would ever have caught it.
 *
 * Keeping it in one file also means reviewing the product's voice is a review
 * of one file rather than forty.
 */

export const SHELL = {
	/* الرئيسية */
	home: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
	/* الكورسات */
	courses: "\u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a",
	/* كورساتي الحالية */
	myCourses: "\u0643\u0648\u0631\u0633\u0627\u062a\u064a \u0627\u0644\u062d\u0627\u0644\u064a\u0629",
	/* المنتدى */
	forum: "\u0627\u0644\u0645\u0646\u062a\u062f\u0649",
	/* حسابي */
	account: "\u062d\u0633\u0627\u0628\u064a",
	/* البث المباشر */
	live: "\u0627\u0644\u0628\u062b \u0627\u0644\u0645\u0628\u0627\u0634\u0631",
	/* المركز المالي */
	financial: "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0645\u0627\u0644\u064a",
	/* شحن المحفظة */
	topUp: "\u0634\u062d\u0646 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
	/* كود سنتر */
	centreCode: "\u0643\u0648\u062f \u0633\u0646\u062a\u0631",
	/* بنك الأسئلة */
	questionBank: "\u0628\u0646\u0643 \u0627\u0644\u0623\u0633\u0626\u0644\u0629",
	/* امتحان خاص بيك */
	ownExam: "\u0627\u0645\u062a\u062d\u0627\u0646 \u062e\u0627\u0635 \u0628\u064a\u0643",
	/* النتائج */
	results: "\u0627\u0644\u0646\u062a\u0627\u0626\u062c",
	/* الإشعارات */
	notifications: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
	/* جنيه */
	currency: "\u062c\u0646\u064a\u0647",
	/* ابحث هنا */
	searchPlaceholder: "\u0627\u0628\u062d\u062b \u0647\u0646\u0627",
	/* بحث */
	search: "\u0628\u062d\u062b",
	/* تصغير القائمة */
	collapse: "\u062a\u0635\u063a\u064a\u0631 \u0627\u0644\u0642\u0627\u0626\u0645\u0629",
	/* توسيع القائمة */
	expand: "\u062a\u0648\u0633\u064a\u0639 \u0627\u0644\u0642\u0627\u0626\u0645\u0629",
	/* الوضع الليلي */
	theme: "\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0644\u064a\u0644\u064a",
	/* تخطي إلى المحتوى */
	skipToContent:
		"\u062a\u062e\u0637\u064a \u0625\u0644\u0649 \u0627\u0644\u0645\u062d\u062a\u0648\u0649",
	/* الصفحات */
	pages: "\u0627\u0644\u0635\u0641\u062d\u0627\u062a",
	/* المساعدة */
	help: "\u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0629",
	/* تابعنا */
	followUs: "\u062a\u0627\u0628\u0639\u0646\u0627",
	/* جميع الحقوق محفوظة */
	rightsReserved:
		"\u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629",
	/* منصة تعليمية تذاكر معاك خطوة بخطوة. */
	tagline:
		"\u0645\u0646\u0635\u0629 \u062a\u0639\u0644\u064a\u0645\u064a\u0629 \u062a\u0630\u0627\u0643\u0631 \u0645\u0639\u0627\u0643 \u062e\u0637\u0648\u0629 \u0628\u062e\u0637\u0648\u0629.",
	/* واتساب */
	whatsapp: "\u0648\u0627\u062a\u0633\u0627\u0628",
	/* الدعم */
	support: "\u0627\u0644\u062f\u0639\u0645",
	/* فيسبوك */
	facebook: "\u0641\u064a\u0633\u0628\u0648\u0643",
	/* انستجرام */
	instagram: "\u0627\u0646\u0633\u062a\u062c\u0631\u0627\u0645",
	/* يوتيوب */
	youtube: "\u064a\u0648\u062a\u064a\u0648\u0628",
	/* تيك توك */
	tiktok: "\u062a\u064a\u0643 \u062a\u0648\u0643",
	/* عرض الكل */
	viewAll: "\u0639\u0631\u0636 \u0627\u0644\u0643\u0644",
	/* خطوات: */
	stepsLabel: "\u062e\u0637\u0648\u0627\u062a:",
} as const;

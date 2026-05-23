export const clerkAuthAppearance = {
  variables: {
    colorPrimary: "#2563eb",
    colorText: "var(--foreground)",
    colorBackground: "transparent",
    borderRadius: "0.75rem",
    fontFamily: '"Cairo", "Segoe UI", Arial, sans-serif',
  },
  elements: {
    rootBox: "w-full",
    card: "bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700/80 p-2",
    headerTitle: "text-slate-900 dark:text-white font-bold",
    headerSubtitle: "text-slate-500 dark:text-slate-400",
    socialButtonsBlockButton:
      "border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
    formButtonPrimary:
      "bg-gradient-to-l from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl transition-all w-full shadow-md",
    formFieldInput:
      "px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500",
    formFieldLabel: "text-slate-700 dark:text-slate-300 font-medium",
    footerActionLink: "text-sky-600 dark:text-sky-400 hover:underline font-medium",
    identityPreviewEditButton: "text-sky-600",
    formFieldAction: "text-sky-600",
    dividerLine: "bg-slate-200 dark:bg-slate-700",
    dividerText: "text-slate-500",
  },
} as const;

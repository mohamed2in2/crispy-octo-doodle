import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorReporter } from "@/components/ErrorReporter";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة Code-UP الكورسات | تعلّم الرياضيات والعلوم للمتعلمين المصريين",
  description: "منصة كورسات متكاملة للمتعلمين المصريين لمختلف الأعمار والمستويات. محاضرات فيديو، اختبارات تفاعلية، ومتابعة ذكية للتقدم التدريبي.",
  icons: {
    icon: "/logo.jpeg",
  },
  openGraph: {
    title: "منصة Code-UP الكورسات | تعلّم الرياضيات والعلوم للمتعلمين المصريين",
    description: "منصة كورسات متكاملة للمتعلمين المصريين لمختلف الأعمار والمستويات. محاضرات فيديو، اختبارات تفاعلية، ومتابعة ذكية للتقدم التدريبي.",
    url: "https://code-up.tech",
    siteName: "منصة Code-UP",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "منصة Code-UP الكورسات",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "منصة Code-UP الكورسات | تعلّم الرياضيات والعلوم للمتعلمين المصريين",
    description: "منصة كورسات متكاملة للمتعلمين المصريين لمختلف الأعمار والمستويات. محاضرات فيديو، اختبارات تفاعلية، ومتابعة ذكية للتقدم التدريبي.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://code-up.tech",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ErrorReporter />
          <ToastProvider>
            {children}
            <AIAssistant />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

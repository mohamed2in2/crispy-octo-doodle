import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorReporter } from "@/components/ErrorReporter";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { verifyToken } from "@/lib/auth";
import { getMaintenanceMode, getMaintenanceMessage } from "@/lib/settings";
import "./globals.css";

/**
 * Decide whether the public maintenance screen should replace the page.
 * Superadmins bypass it entirely (they see the live site), and /adminpanel +
 * /maintenance are always reachable so admins can still log in.
 */
async function resolveMaintenance(): Promise<{ gated: boolean; message: string }> {
  try {
    const on = await getMaintenanceMode();
    if (!on) return { gated: false, message: "" };

    const hdrs = await headers();
    const pathname = hdrs.get("x-pathname") ?? "";
    if (pathname.startsWith("/adminpanel") || pathname === "/maintenance") {
      return { gated: false, message: "" };
    }

    // Superadmins (named or break-glass) bypass — role is in the JWT, no DB hit.
    const token = (await cookies()).get("auth_token")?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.role === "superadmin") return { gated: false, message: "" };
    }

    return { gated: true, message: await getMaintenanceMessage() };
  } catch {
    // Fail open: never let the maintenance check take down every page.
    return { gated: false, message: "" };
  }
}

export const metadata: Metadata = {
  metadataBase: new URL("https://code-up.tech"),
  title: {
    default: "منصة Code-UP التعليمية",
    template: "%s | منصة Code-UP",
  },
  description: "تعلّم الرياضيات والعلوم للطلاب المصريين",
  keywords: ["كورسات", "تعليم", "برمجة", "رياضيات", "علوم", "مصر", "Code-UP", "منصة تعليمية", "ثانوية عامة", "إعدادية"],
  icons: {
    icon: "/logo.jpeg",
  },
  openGraph: {
    title: "منصة Code-UP التعليمية",
    description: "تعلّم الرياضيات والعلوم للطلاب المصريين",
    url: "https://code-up.tech",
    siteName: "منصة Code-UP",
    locale: "ar",
    type: "website",
    images: [
      {
        url: "https://code-up.tech/og-image.jpeg",
        width: 1200,
        height: 630,
        alt: "منصة Code-UP التعليمية",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "منصة Code-UP التعليمية",
    description: "تعلّم الرياضيات والعلوم للطلاب المصريين",
    images: ["https://code-up.tech/og-image.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "e-Your-Google-Search-Console-Verification-Code", // placeholder, but good practice
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { gated, message } = await resolveMaintenance();

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0E6E62" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Code-UP" />
        <link rel="apple-touch-icon" href="/logo.jpeg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}` }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {gated ? (
            <MaintenanceScreen message={message} />
          ) : (
            <>
              <ErrorReporter />
              <ToastProvider>
                {children}
                <AIAssistant />
              </ToastProvider>
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}

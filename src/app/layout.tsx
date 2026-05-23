import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const metadata: Metadata = {
  title: "منصة التعليم - EdTech Platform",
  description: "منصة تعليمية شاملة للطلاب المصريين من الصف السادس الابتدائي حتى الثالث الثانوي",
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
          <ToastProvider>
            {clerkPublishableKey?.startsWith("pk_") ? (
              <ClerkProvider
                publishableKey={clerkPublishableKey}
                signInUrl="/login"
                signUpUrl="/signup"
                afterSignOutUrl="/login"
              >
                {children}
              </ClerkProvider>
            ) : (
              children
            )}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

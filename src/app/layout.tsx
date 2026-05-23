import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ClerkErrorBoundary } from "@/components/auth/ClerkErrorBoundary";
import { ClerkRuntimeProvider } from "@/components/auth/ClerkRuntimeProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const clerkLivePublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkTestPublishableKey = process.env.NEXT_PUBLIC_CLERK_TEST_PUBLISHABLE_KEY;

async function getRequestHost() {
  const headersList = await headers();
  const forwardedHost = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  return forwardedHost.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

function isProductionHost(hostname: string) {
  return hostname === "alasly.live" || hostname.endsWith(".alasly.live");
}

export const metadata: Metadata = {
  title: "منصة التعليم - EdTech Platform",
  description: "منصة تعليمية شاملة للطلاب المصريين من الصف السادس الابتدائي حتى الثالث الثانوي",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHost = await getRequestHost();
  const clerkPublishableKey = isProductionHost(requestHost)
    ? clerkLivePublishableKey
    : clerkTestPublishableKey;
  const clerkEnabled = Boolean(clerkPublishableKey);

  const allowedOrigins = [
    "localhost:3000",
    "127.0.0.1:3000",
    "*.app.github.dev",      // GitHub Codespaces
    "*.github.dev",          // GitHub Codespaces (all)
  ];
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    allowedOrigins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

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
            <ClerkRuntimeProvider enabled={clerkEnabled}>
              {clerkEnabled && clerkPublishableKey?.startsWith("pk_") ? (
                <ClerkErrorBoundary>
                  <ClerkProvider
                    publishableKey={clerkPublishableKey}
                    signInUrl="/login"
                    signUpUrl="/signup"
                    afterSignOutUrl="/login"
                    allowedRedirectOrigins={allowedOrigins}
                    domain={process.env.NEXT_PUBLIC_CLERK_DOMAIN || "clerk.alasly.live"}
                    proxyUrl={process.env.NEXT_PUBLIC_CLERK_PROXY_URL}
                    sdkMetadata={{
                      name: "alasly-edtech",
                      version: "1.0.0",
                    }}
                  >
                    {children}
                  </ClerkProvider>
                </ClerkErrorBoundary>
              ) : (
                children
              )}
            </ClerkRuntimeProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

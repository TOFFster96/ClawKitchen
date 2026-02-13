import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Claw Kitchen",
  description: "Local-first UI for authoring ClawRecipes recipes and scaffolding agents/teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Apply theme before React hydration to avoid light→dark flash on navigation.
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const key = "ck-theme";
    const saved = window.localStorage.getItem(key);
    const theme = saved === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  } catch {
    // ignore
  }
})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ICSE Project Forge — AI-forged ICSE projects + mock papers",
  description:
    "AI-powered ICSE Board (Class 9-10) project assistant. Upload your notes and forge a complete, original ICSE project with diagrams, plus specimen-style mock papers.",
  keywords: [
    "ICSE",
    "ICSE project",
    "Class 10 project",
    "Class 9 project",
    "AI project generator",
    "mock paper",
    "CISCE",
    "Indian board exams",
  ],
  authors: [{ name: "ICSE Project Forge" }],
  openGraph: {
    title: "ICSE Project Forge",
    description:
      "AI-forged ICSE projects with diagrams + mock papers — trained on ICSE board data.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground transition-colors duration-300 relative`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* Ambient Backdrop System */}
          <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none">
            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-grid-pattern opacity-40 dark:opacity-15" />
            
            {/* Glowing Blobs */}
            <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 dark:bg-indigo-500/8 blur-[120px] animate-pulse-slow" />
            <div className="absolute top-[30%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-teal-500/10 dark:bg-teal-500/8 blur-[130px] animate-pulse-medium" />
            <div className="absolute -bottom-[10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-fuchsia-500/5 dark:bg-fuchsia-500/4 blur-[120px] animate-pulse-slow" />
          </div>

          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}


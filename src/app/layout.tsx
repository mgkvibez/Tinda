import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/header";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Tinda - Swipe Your Way to the Perfect Job or Talent",
  description: "Tinda: Match talent with opportunity. Swipe, match, and chat with top talent or dream jobs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Tinda",
    description: "Swipe Your Way to the Perfect Job or Talent",
    siteName: "Tinda",
    images: [
      {
        url: "https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
        width: 1200,
        height: 630,
        alt: "Tinda - Recruitment Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tinda",
    description: "Swipe Your Way to the Perfect Job or Talent",
    images: ["https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={cn("min-h-screen bg-background font-sans antialiased", geist.variable)}>
        <Header />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

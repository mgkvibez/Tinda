import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/components/providers/auth-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "MatchHire - Swipe Your Way to the Perfect Job or Talent",
  description: "MatchHire: The Tinder/Bumble for recruitment. Swipe, match, and chat with top talent or dream jobs.",
  openGraph: {
    title: "MatchHire",
    description: "Swipe Your Way to the Perfect Job or Talent",
    url: "https://matchhire.com", // Replace with your domain
    siteName: "MatchHire",
    images: [
      {
        url: "https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2", // Placeholder image from Pexels
        width: 1200,
        height: 630,
        alt: "MatchHire - Recruitment Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MatchHire",
    description: "Swipe Your Way to the Perfect Job or Talent",
    images: ["https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"], // Placeholder image from Pexels
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
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

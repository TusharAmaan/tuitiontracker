import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// --- SEO & SOCIAL MEDIA METADATA ---
export const metadata: Metadata = {
  title: "TuitionTracker — The All-in-One Dashboard for Tutors",
  description: "Simplify your teaching business. Track student lessons, manage batches, monitor payment status (Paid/Due), and generate progress reports in one secure app.",
  keywords: ["tutor", "tuition manager", "lesson tracker", "student management", "payment tracker", "coaching classes", "private tutor app"],
  authors: [{ name: "Tushar Aman" }], // Replace with your actual name if you want
  openGraph: {
    title: "TuitionTracker — Manage Students & Payments Effortlessly",
    description: "Stop using paper diaries. Track lessons, attendance, and fees with the smartest app for private tutors.",
    url: "https://lessontracker-6qs7.vercel.app", // Your actual Vercel URL
    siteName: "TuitionTracker",
    locale: "en_US",
    type: "website",
  },
};
// -----------------------------------

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
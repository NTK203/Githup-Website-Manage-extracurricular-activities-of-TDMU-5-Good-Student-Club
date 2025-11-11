import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAuthProvider from "@/components/providers/GoogleOAuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CLB Sinh viên 5 Tốt TDMU - Hệ thống Quản lý",
  description: "Hệ thống quản lý hoạt động ngoại khóa của CLB Sinh viên 5 Tốt TDMU. Quản lý thành viên, hoạt động và tương tác trong câu lạc bộ.",
  keywords: ["CLB", "Sinh viên 5 Tốt", "TDMU", "Quản lý", "Hoạt động ngoại khóa"],
  authors: [{ name: "CLB Sinh viên 5 Tốt TDMU" }],
  openGraph: {
    title: "CLB Sinh viên 5 Tốt TDMU",
    description: "Hệ thống quản lý hoạt động ngoại khóa",
    type: "website",
    locale: "vi_VN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className="scroll-smooth dark:bg-slate-900" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/logo_clb_sv_5T.jpg" />
        <link rel="apple-touch-icon" href="/logo_clb_sv_5T.jpg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} ${geistMono.variable} font-sans antialiased bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900`}
        suppressHydrationWarning
      >
        <GoogleAuthProvider>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}

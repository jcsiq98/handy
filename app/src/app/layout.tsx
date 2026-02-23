import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Handy — Servicios a tu alcance",
  description:
    "Conectamos a jóvenes con los mejores prestadores de servicios del hogar. Plomería, electricidad, limpieza y más.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Handy",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900`}
      >
        {/* Mobile container — max 480px centered */}
        <div className="mx-auto max-w-[480px] min-h-screen bg-white shadow-sm">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}

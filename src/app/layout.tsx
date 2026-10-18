import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import Providers from "./providers";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: { default: "Lucibook", template: "%s · Lucibook" },
  description: "Catat, simpan, dan bagikan ide-idemu.",
  applicationName: "Lucibook",
  appleWebApp: { capable: true, title: "Lucibook", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F092B1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Logo } from "@/components/logo";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TutorPar · Tutorías entre pares UABC",
    template: "%s · TutorPar",
  },
  description:
    "Tutorías entre pares para estudiantes de ciencias e ingeniería de la UABC Ensenada. Encuentra tutores verificados de Cálculo, Física, Programación y más.",
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Link href="/" aria-label="TutorPar, inicio">
              <Logo />
            </Link>
            <p>Tutorías entre pares · UABC Ensenada · Versión 1 (pagos simulados)</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

import type { ReactNode } from "react";
import { Card } from "./ui";

export function AuthShell({
  title,
  subtitle,
  children,
  aside,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_1.1fr] md:py-16">
      <div className="hidden flex-col justify-center md:flex">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-3 text-lg text-slate-600">{subtitle}</p>
        {aside}
      </div>
      <Card className="p-6 sm:p-8">
        <div className="mb-6 md:hidden">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-slate-600">{subtitle}</p>
        </div>
        {children}
      </Card>
    </div>
  );
}

import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium sm:px-6">
        <Info className="size-3.5 shrink-0" aria-hidden />
        Versión demo: los datos son de ejemplo y no se guarda información.
      </p>
    </div>
  );
}

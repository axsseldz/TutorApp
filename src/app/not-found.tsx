import { SearchX } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={<SearchX />}
        title="No encontramos esta página"
        description="Puede que el enlace esté mal escrito o que el contenido ya no exista."
        action={<ButtonLink href="/">Volver al inicio</ButtonLink>}
      />
    </div>
  );
}

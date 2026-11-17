import type { Metadata } from "next";
import { DEMO_USER, SUBJECTS } from "@/lib/data";
import { RoleBadge } from "@/components/labels";
import { ProfileForm, TutorApplicationForm } from "@/components/forms/profile-forms";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Mi perfil" };

export default function ProfilePage() {
  const user = DEMO_USER;
  const subjects = SUBJECTS.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Mi perfil"
        description={
          <span className="inline-flex items-center gap-2">
            Tipo de cuenta: <RoleBadge role={user.role} />
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit p-6">
          <h2 className="mb-4 text-lg font-semibold">Mis datos</h2>
          <ProfileForm
            defaults={{
              name: user.name,
              email: user.email,
              career: user.career,
              semester: String(user.semester),
              phone: user.phone,
            }}
          />
        </Card>

        <section id="ser-tutor" className="scroll-mt-24">
          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold">Ser tutor</h2>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                ¿Vas en semestres avanzados y dominas alguna materia básica? Sube tu kárdex o constancia, elige tus
                materias y tu tarifa. Un administrador revisará tu solicitud.
              </p>
              <TutorApplicationForm subjects={subjects} />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

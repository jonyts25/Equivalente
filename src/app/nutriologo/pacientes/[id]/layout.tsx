import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900">
        <div className="mx-auto max-w-3xl">Paciente: {patient.full_name}</div>
      </div>
      {children}
    </>
  );
}

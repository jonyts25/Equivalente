import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MenuStatus } from "@/types/database";

const STATUS_LABELS: Record<MenuStatus, string> = {
  draft: "Borrador",
  pending_review: "Pendiente revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  favorite: "Favorito",
  patient_rejected: "Rechazado por paciente",
  requires_clarification: "Requiere aclaración",
  blocked: "Bloqueado",
};

const STATUS_VARIANT: Record<MenuStatus, "default" | "secondary" | "warning" | "destructive" | "outline"> = {
  draft: "secondary",
  pending_review: "warning",
  approved: "default",
  rejected: "destructive",
  favorite: "default",
  patient_rejected: "destructive",
  requires_clarification: "warning",
  blocked: "destructive",
};

interface MenuCardProps {
  title: string;
  status: MenuStatus;
  explanation?: string | null;
  children?: React.ReactNode;
}

export function MenuCard({ title, status, explanation, children }: MenuCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {explanation && <CardDescription>{explanation}</CardDescription>}
        </div>
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}

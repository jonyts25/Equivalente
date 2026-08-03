import Link from "next/link";
import { MenuCard } from "@/components/menus/MenuCard";
import { MenuActions } from "@/components/menus/MenuActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  extractIaDraftSummary,
  isIaLocalContextualDraft,
} from "@/lib/ai/contextual-draft";
import type { MenuStatus } from "@/types/database";

type MenuRow = {
  id: string;
  title: string;
  status: MenuStatus;
  explanation: string | null;
  content_json: Record<string, unknown>;
  created_at: string;
  meal_slots?: { name: string } | { name: string }[] | null;
};

function mealSlotName(row: MenuRow): string | null {
  const slot = row.meal_slots;
  if (!slot) return null;
  if (Array.isArray(slot)) return slot[0]?.name ?? null;
  return slot.name;
}

interface IaDraftMenuCardProps {
  menu: MenuRow;
  patientId: string;
  role: "admin" | "nutritionist";
}

export function IaDraftMenuCard({ menu, patientId, role }: IaDraftMenuCardProps) {
  const summary = extractIaDraftSummary(menu.content_json);
  const isIa = isIaLocalContextualDraft(menu.content_json);

  return (
    <MenuCard title={menu.title} status={menu.status} explanation={menu.explanation}>
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span>{new Date(menu.created_at).toLocaleString("es-MX")}</span>
          {mealSlotName(menu) && <span>· Comida: {mealSlotName(menu)}</span>}
          {isIa && (
            <>
              <Badge variant="outline" className="text-xs">IA local</Badge>
              {summary.model && <span>· {summary.provider}/{summary.model}</span>}
            </>
          )}
        </div>

        {summary.requiereRevision && (
          <Badge className="bg-amber-100 text-amber-900">Requiere revisión nutrióloga</Badge>
        )}

        {summary.flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {summary.flags.slice(0, 5).map((f) => (
              <Badge key={f} variant="outline" className="text-xs font-normal">{f}</Badge>
            ))}
          </div>
        )}

        {summary.confianza != null && (
          <p className="text-xs text-slate-500">Confianza: {summary.confianza.toFixed(2)}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/nutriologo/pacientes/${patientId}/menus/${menu.id}`}>Ver detalle</Link>
          </Button>
          <MenuActions menuId={menu.id} role={role} patientId={patientId} isIaDraft={isIa} />
        </div>
      </div>
    </MenuCard>
  );
}

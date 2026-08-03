"use client";

import { useState } from "react";
import { deleteContextualAiDraft } from "@/app/actions/equivalente-ia";
import { updateMenuStatus } from "@/app/actions/menus";
import { Button } from "@/components/ui/button";
import type { MenuStatus } from "@/types/database";

interface MenuActionsProps {
  menuId: string;
  role: "nutritionist" | "patient" | "admin";
  patientId?: string;
  isIaDraft?: boolean;
}

export function MenuActions({ menuId, role, patientId, isIaDraft }: MenuActionsProps) {
  const [loading, setLoading] = useState(false);

  async function handleStatus(status: MenuStatus) {
    setLoading(true);
    try {
      await updateMenuStatus(menuId, status);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!patientId || !isIaDraft) return;
    if (!window.confirm("¿Eliminar este borrador de IA local?")) return;
    setLoading(true);
    try {
      await deleteContextualAiDraft(menuId, patientId);
    } finally {
      setLoading(false);
    }
  }

  if (role === "nutritionist" || role === "admin") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={loading} onClick={() => void handleStatus("approved")}>
          Aprobar
        </Button>
        <Button size="sm" variant="destructive" disabled={loading} onClick={() => void handleStatus("rejected")}>
          Rechazar
        </Button>
        <Button size="sm" variant="secondary" disabled={loading} onClick={() => void handleStatus("draft")}>
          Borrador
        </Button>
        {isIaDraft && patientId && (
          <Button size="sm" variant="outline" disabled={loading} onClick={() => void handleDelete()}>
            Borrar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={loading} onClick={() => void handleStatus("favorite")}>
        Favorito
      </Button>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => void handleStatus("patient_rejected")}>
        Rechazar
      </Button>
    </div>
  );
}

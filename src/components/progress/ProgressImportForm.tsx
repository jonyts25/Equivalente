"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyProgressExcelImport,
  previewProgressExcelImport,
} from "@/app/actions/progress-import";
import type { ParsedProgressWorkbook } from "@/lib/progress/excel-parser";
import type { ImportDuplicateMode } from "@/lib/progress/import-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ProgressImportForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<{
    parsed: ParsedProgressWorkbook;
    stats: Record<string, number>;
    duplicateCheckins: number;
    duplicateComposition: number;
    duplicateAdherence: number;
    warnings: string[];
    errors: string[];
  } | null>(null);
  const [fileName, setFileName] = useState("");
  const [duplicateMode, setDuplicateMode] = useState<ImportDuplicateMode>("skip");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const data = await previewProgressExcelImport({ patientId, fileBase64: base64 });
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al leer archivo");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const stats = await applyProgressExcelImport({
        patientId,
        parsed: preview.parsed,
        duplicateMode,
        fileName,
      });
      setResult(
        `Importado: baseline=${stats.baselineUpserted ? "sí" : "no"}, check-ins +${stats.checkinsCreated}/~${stats.checkinsUpdated}, composición +${stats.compositionCreated}/~${stats.compositionUpdated}, adherencia +${stats.adherenceCreated}.`
      );
      router.push(`/nutriologo/pacientes/${patientId}/seguimiento`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTitle>Validación nutrióloga requerida</AlertTitle>
        <AlertDescription>
          Los datos importados desde Excel deben revisarse antes de publicarse al paciente.
          No se importa teléfono.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="xlsx">Archivo Excel (.xlsx)</Label>
        <input
          id="xlsx"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => void handleFile(e)}
        />
      </div>

      {preview && (
        <div className="rounded-lg border bg-slate-50 p-4 text-sm space-y-2">
          <p><strong>Datos base:</strong> {preview.stats.baseline ? "detectados" : "no"}</p>
          <p><strong>Check-ins:</strong> {preview.stats.checkins}</p>
          <p><strong>Composición:</strong> {preview.stats.bodyComposition}</p>
          <p><strong>Notas adherencia:</strong> {preview.stats.adherenceNotes}</p>
          <p><strong>Duplicados:</strong> check-ins {preview.duplicateCheckins}, composición {preview.duplicateComposition}</p>
          {preview.warnings.slice(0, 8).map((w) => (
            <p key={w} className="text-xs text-amber-800">· {w}</p>
          ))}
          {preview.errors.map((e) => (
            <p key={e} className="text-xs text-red-700">· {e}</p>
          ))}

          <div className="space-y-2 pt-2">
            <Label htmlFor="dup-mode">Duplicados</Label>
            <select
              id="dup-mode"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={duplicateMode}
              onChange={(e) => setDuplicateMode(e.target.value as ImportDuplicateMode)}
            >
              <option value="skip">Omitir duplicados</option>
              <option value="update">Actualizar existentes</option>
              <option value="import_anyway">Importar de todos modos</option>
            </select>
          </div>

          <Button type="button" disabled={loading || preview.errors.length > 0} onClick={() => void handleImport()}>
            {loading ? "Importando…" : "Importar seguimiento"}
          </Button>
        </div>
      )}

      {result && <p className="text-sm text-emerald-700">{result}</p>}
      {error && (
        <Alert>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

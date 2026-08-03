import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <Alert className="border-slate-200 bg-slate-50 text-slate-700">
      <Info className="h-4 w-4 shrink-0" />
      <AlertDescription>
        Equivalente no reemplaza atención nutricional profesional. Las opciones son variaciones
        equivalentes basadas en la dieta y reglas configuradas por tu nutriólogo.
      </AlertDescription>
    </Alert>
  );
}

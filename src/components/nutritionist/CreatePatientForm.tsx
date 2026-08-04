"use client";

import { useState } from "react";
import Link from "next/link";
import { createPatient } from "@/app/actions/patients";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreatePatientForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    patientId: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (created) return;
    setSaving(true);
    setError(null);
    try {
      const result = await createPatient({
        fullName,
        email,
        phone: phone || undefined,
        goal: goal || undefined,
      });
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear paciente");
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paciente creado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>Copia estos datos ahora</AlertTitle>
            <AlertDescription>
              La contraseña temporal no se volverá a mostrar. Compártela con el
              paciente por un canal seguro.
            </AlertDescription>
          </Alert>
          <div className="space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
            <p>
              <span className="text-slate-500">Email:</span>{" "}
              <strong className="select-all">{created.email}</strong>
            </p>
            <p>
              <span className="text-slate-500">Contraseña temporal:</span>{" "}
              <strong className="select-all font-mono">
                {created.temporaryPassword}
              </strong>
            </p>
          </div>
          <Button asChild>
            <Link href={`/nutriologo/pacientes/${created.patientId}`}>
              Ir al perfil del paciente
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datos del paciente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Nombre completo</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Ana López"
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (login)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="paciente@correo.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 55 1234 5678"
              autoComplete="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Objetivo (opcional)</Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ej. Control de peso"
            />
          </div>
          {error && (
            <Alert>
              <AlertTitle>No se pudo crear</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={saving || !fullName.trim() || !email.trim()}>
            {saving ? "Creando…" : "Crear paciente"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

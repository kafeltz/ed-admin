import { useCallback, useEffect, useState } from "react";
import { Loader2, Bot } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const ROBOS_LABELS: Record<string, string> = {
  vivareal: "VivaReal",
  remax: "RE/MAX",
  chavesnamao: "Chaves na Mão",
  imoveis_sc: "ImóveisSC",
};

export function ConfiguracoesPage() {
  const [robos, setRobos] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  const buscarConfig = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/configuracoes/robos");
      if (res.ok) {
        const data = await res.json();
        setRobos(data.robos_habilitados ?? {});
      }
    } catch {
      toast.error("Erro ao buscar configurações");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarConfig();
  }, [buscarConfig]);

  async function toggleRobo(nome: string, habilitado: boolean) {
    const anterior = { ...robos };
    const novos = { ...robos, [nome]: habilitado };
    setRobos(novos);
    setSalvando(nome);

    try {
      const res = await apiFetch("/api/v1/configuracoes/robos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robos_habilitados: novos }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setRobos(data.robos_habilitados);
      toast.success(
        `${ROBOS_LABELS[nome] ?? nome} ${habilitado ? "habilitado" : "desabilitado"}`,
      );
    } catch {
      setRobos(anterior);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSalvando(null);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Controle do worker de scraping
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Robôs de scraping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(ROBOS_LABELS).map(([nome, label]) => {
            const habilitado = robos[nome] ?? true;
            const estaSalvando = salvando === nome;

            return (
              <div
                key={nome}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {label}
                  </span>
                  {estaSalvando && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium ${
                      habilitado ? "text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {habilitado ? "ON" : "OFF"}
                  </span>
                  <Switch
                    checked={habilitado}
                    onCheckedChange={(v) => toggleRobo(nome, v)}
                    disabled={estaSalvando}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

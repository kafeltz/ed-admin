import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Plus, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Cep {
  id: number;
  cep: string;
  status: "pendente" | "processando" | "concluido" | "erro";
  erro_msg: string | null;
  tentativas: number;
  total_anuncios: number;
  criado_em: string;
  atualizado_em: string;
}

const formatarCep = (valor: string): string => {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
};

const cepCompleto = (cep: string): boolean =>
  cep.replace(/\D/g, "").length === 8;

const formatarCepExibicao = (cepLimpo: string) =>
  `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;

function StatusBadge({ cep }: { cep: Cep }) {
  switch (cep.status) {
    case "pendente":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
    case "processando":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Processando
        </Badge>
      );
    case "concluido":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Concluido — {cep.total_anuncios} anuncio(s)
        </Badge>
      );
    case "erro":
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Erro — tentativa {cep.tentativas}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-xs font-mono whitespace-pre-wrap">{cep.erro_msg || "Sem detalhes"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
  }
}

export function CadastrarCepPage() {
  const [cep, setCep] = useState("");
  const [cepsCadastrados, setCepsCadastrados] = useState<Cep[]>([]);
  const [carregando, setCarregando] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buscarCeps = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/ceps");
      if (res.ok) {
        const data = await res.json();
        setCepsCadastrados(data);
      }
    } catch {
      // silencioso — polling vai tentar de novo
    }
  }, []);

  useEffect(() => {
    buscarCeps();
    intervalRef.current = setInterval(buscarCeps, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [buscarCeps]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCep(formatarCep(e.target.value));
  };

  const handleCadastrar = async () => {
    if (!cepCompleto(cep)) return;

    setCarregando(true);
    try {
      const res = await fetch("/api/v1/ceps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: cep.replace(/\D/g, "") }),
      });

      if (res.status === 409) {
        toast.error("CEP ja cadastrado");
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || "Erro ao cadastrar CEP");
        return;
      }

      const novo: Cep = await res.json();
      setCepsCadastrados((prev) => [novo, ...prev]);
      setCep("");
      toast.success(`CEP ${cep} cadastrado e enfileirado`);
    } catch {
      toast.error("Erro de conexao com o servidor");
    } finally {
      setCarregando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCadastrar();
    }
  };

  const handleRetry = async (cepRetry: Cep) => {
    try {
      const res = await fetch(`/api/v1/ceps/${cepRetry.id}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        const atualizado: Cep = await res.json();
        setCepsCadastrados((prev) =>
          prev.map((c) => (c.id === atualizado.id ? atualizado : c))
        );
        toast.success(`CEP ${formatarCepExibicao(cepRetry.cep)} reenfileirado`);
      }
    } catch {
      toast.error("Erro ao reprocessar CEP");
    }
  };

  const handleRemover = async (cepRemover: Cep) => {
    try {
      const res = await fetch(`/api/v1/ceps/${cepRemover.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCepsCadastrados((prev) => prev.filter((c) => c.id !== cepRemover.id));
        toast.info(`CEP ${formatarCepExibicao(cepRemover.cep)} removido`);
      }
    } catch {
      toast.error("Erro ao remover CEP");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cadastrar CEP</h1>
        <p className="text-muted-foreground mt-1">
          Adicione CEPs para monitoramento de imoveis na regiao
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo CEP</CardTitle>
          <CardDescription>
            Digite o CEP da regiao que deseja monitorar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                name="cep"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={cep}
                onChange={handleCepChange}
                onKeyDown={handleKeyDown}
                placeholder="Ex: 88015-200"
                className="pl-11 h-12 text-base"
                maxLength={9}
              />
            </div>
            <Button
              onClick={handleCadastrar}
              disabled={!cepCompleto(cep) || carregando}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium h-12 px-6"
            >
              {carregando ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Cadastrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {cepsCadastrados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              CEPs cadastrados ({cepsCadastrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cepsCadastrados.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span className="font-mono text-sm font-medium">
                      {formatarCepExibicao(c.cep)}
                    </span>
                    <StatusBadge cep={c} />
                  </div>
                  <div className="flex items-center gap-1">
                    {c.status === "erro" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRetry(c)}
                        className="h-8 w-8 text-muted-foreground hover:text-accent"
                        title="Reprocessar"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemover(c)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

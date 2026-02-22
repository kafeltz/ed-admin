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
  tipo: "apartamento" | "casa" | null;
  status: "pendente" | "processando" | "concluido" | "erro";
  erro_msg: string | null;
  tentativas: number;
  total_anuncios: number;
  criado_em: string;
  atualizado_em: string;
}

interface EnderecoSugestao {
  label: string;
  lat: number;
  lon: number;
  cidade?: string;
  uf?: string;
  cep?: string;
}

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
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<"apartamento" | "casa">("apartamento");
  const [sugestoes, setSugestoes] = useState<EnderecoSugestao[]>([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [cepsCadastrados, setCepsCadastrados] = useState<Cep[]>([]);
  const [carregando, setCarregando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const buscarCeps = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/ceps");
      if (res.ok) {
        const data: Cep[] = await res.json();
        setCepsCadastrados(data);
        const temAtivos = data.some(
          (c) => c.status === "pendente" || c.status === "processando"
        );
        if (!temAtivos && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
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

  const handleTextoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setTexto(valor);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (valor.trim().length < 2) {
      setSugestoes([]);
      setDropdownAberto(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(`/api/v1/enderecos?q=${encodeURIComponent(valor)}&limit=8`);
        if (res.ok) {
          const data: EnderecoSugestao[] = await res.json();
          setSugestoes(data);
          setDropdownAberto(data.length > 0);
        }
      } catch {
        // silencioso
      } finally {
        setBuscando(false);
      }
    }, 300);
  };

  const handleSelecionarSugestao = async (sugestao: EnderecoSugestao) => {
    setSugestoes([]);
    setDropdownAberto(false);

    if (!sugestao.cep) {
      toast.error("Endereço selecionado não possui CEP associado");
      setTexto(sugestao.label);
      return;
    }

    const cepLimpo = sugestao.cep.replace(/\D/g, "");
    setTexto(sugestao.label);
    setCarregando(true);
    try {
      const res = await fetch("/api/v1/ceps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: cepLimpo, tipo }),
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
      setTexto("");
      toast.success(`${sugestao.label} cadastrado e enfileirado`);
      if (!intervalRef.current) {
        intervalRef.current = setInterval(buscarCeps, 5000);
      }
    } catch {
      toast.error("Erro de conexao com o servidor");
    } finally {
      setCarregando(false);
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
        if (!intervalRef.current) {
          intervalRef.current = setInterval(buscarCeps, 5000);
        }
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
          <CardTitle className="text-lg">Novo endereço</CardTitle>
          <CardDescription>
            Digite o endereço ou CEP da região que deseja monitorar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo("apartamento")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                tipo === "apartamento"
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:border-accent/50"
              }`}
            >
              Apartamentos
            </button>
            <button
              type="button"
              onClick={() => setTipo("casa")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                tipo === "casa"
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:border-accent/50"
              }`}
            >
              Casas
            </button>
          </div>
          <div ref={wrapperRef} className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
            {buscando && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground z-10" />
            )}
            <Input
              type="text"
              autoComplete="on"
              value={texto}
              onChange={handleTextoChange}
              onFocus={() => sugestoes.length > 0 && setDropdownAberto(true)}
              placeholder="Ex: Rua das Flores, Joinville ou 88015-200"
              className="pl-11 h-12 text-base pr-10"
            />

            {dropdownAberto && sugestoes.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                {sugestoes.map((s, i) => (
                  <li
                    key={i}
                    onMouseDown={() => handleSelecionarSugestao(s)}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent/10 border-b border-border/50 last:border-0"
                  >
                    <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">{s.label}</span>
                      {s.cep && (
                        <span className="text-xs text-muted-foreground">CEP: {s.cep}</span>
                      )}
                      {!s.cep && (
                        <span className="text-xs text-muted-foreground italic">sem CEP</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {carregando && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Cadastrando...
            </p>
          )}
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
                    {c.tipo && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {c.tipo === "apartamento" ? "Apto" : "Casa"}
                      </Badge>
                    )}
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

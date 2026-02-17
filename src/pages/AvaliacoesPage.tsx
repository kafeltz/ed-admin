import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Download, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarPreco, formatarCep, formatarData } from "@/lib/formatters";

interface Avaliacao {
  id: number;
  cep: string;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  area_interna_m2: number;
  dormitorios: number | null;
  minimo: number | null;
  medio: number | null;
  maximo: number | null;
  sugerido: number | null;
  confidence_score: number | null;
  pam2_medio: number | null;
  comparaveis_usados: number | null;
  criado_em: string;
}

function ConfiancaBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">—</span>;

  if (score >= 70) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        {score}%
      </Badge>
    );
  }
  if (score >= 40) {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        {score}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      {score}%
    </Badge>
  );
}

function exportarCsv(avaliacoes: Avaliacao[]) {
  const header = "Data,CEP,Endereco,Area m2,Sugerido,Minimo,Maximo,PAM2/m2,Confianca %,Comparaveis";
  const linhas = avaliacoes.map((a) =>
    [
      a.criado_em,
      formatarCep(a.cep),
      `"${(a.endereco ?? "").replace(/"/g, '""')}"`,
      a.area_interna_m2,
      a.sugerido ?? "",
      a.minimo ?? "",
      a.maximo ?? "",
      a.pam2_medio !== null ? Math.round(a.pam2_medio) : "",
      a.confidence_score ?? "",
      a.comparaveis_usados ?? "",
    ].join(",")
  );
  const csv = [header, ...linhas].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "avaliacoes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function AvaliacoesPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [filtroCep, setFiltroCep] = useState("");
  const [filtroConfianca, setFiltroConfianca] = useState<string>("");
  const [filtroPrecoMin, setFiltroPrecoMin] = useState("");
  const [filtroPrecoMax, setFiltroPrecoMax] = useState("");

  useEffect(() => {
    fetch("/api/v1/avaliacoes")
      .then((res) => res.json())
      .then((data: Avaliacao[]) => setAvaliacoes(data))
      .catch(() => toast.error("Erro ao carregar avaliacoes"))
      .finally(() => setCarregando(false));
  }, []);

  const cepsUnicos = useMemo(
    () => [...new Set(avaliacoes.map((a) => a.cep))].sort(),
    [avaliacoes]
  );

  const filtradas = useMemo(() => {
    return avaliacoes.filter((a) => {
      if (filtroCep && a.cep !== filtroCep) return false;

      if (filtroConfianca) {
        const score = a.confidence_score;
        if (filtroConfianca === "alta" && (score === null || score < 70)) return false;
        if (filtroConfianca === "media" && (score === null || score < 40 || score >= 70)) return false;
        if (filtroConfianca === "baixa" && (score === null || score >= 40)) return false;
      }

      if (filtroPrecoMin) {
        const min = Number(filtroPrecoMin);
        if (a.sugerido === null || a.sugerido < min) return false;
      }
      if (filtroPrecoMax) {
        const max = Number(filtroPrecoMax);
        if (a.sugerido === null || a.sugerido > max) return false;
      }

      return true;
    });
  }, [avaliacoes, filtroCep, filtroConfianca, filtroPrecoMin, filtroPrecoMax]);

  const temFiltroAtivo = filtroCep || filtroConfianca || filtroPrecoMin || filtroPrecoMax;

  const limparFiltros = () => {
    setFiltroCep("");
    setFiltroConfianca("");
    setFiltroPrecoMin("");
    setFiltroPrecoMax("");
  };

  if (carregando) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Avaliacoes</h1>
        <p className="text-muted-foreground mt-1">
          Historico de avaliacoes realizadas pelo pipeline
        </p>
      </div>

      {avaliacoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma avaliacao encontrada</p>
            <p className="text-sm mt-1">
              As avaliacoes aparecerao aqui apos serem processadas
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm text-muted-foreground mb-1 block">CEP</label>
                  <select
                    value={filtroCep}
                    onChange={(e) => setFiltroCep(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Todos</option>
                    {cepsUnicos.map((c) => (
                      <option key={c} value={c}>
                        {formatarCep(c)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm text-muted-foreground mb-1 block">Confianca</label>
                  <select
                    value={filtroConfianca}
                    onChange={(e) => setFiltroConfianca(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Todas</option>
                    <option value="alta">Alta (70%+)</option>
                    <option value="media">Media (40-69%)</option>
                    <option value="baixa">Baixa (&lt;40%)</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[130px]">
                  <label className="text-sm text-muted-foreground mb-1 block">Preco min</label>
                  <Input
                    type="number"
                    placeholder="Ex: 200000"
                    value={filtroPrecoMin}
                    onChange={(e) => setFiltroPrecoMin(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="flex-1 min-w-[130px]">
                  <label className="text-sm text-muted-foreground mb-1 block">Preco max</label>
                  <Input
                    type="number"
                    placeholder="Ex: 800000"
                    value={filtroPrecoMax}
                    onChange={(e) => setFiltroPrecoMax(e.target.value)}
                    className="h-9"
                  />
                </div>

                {temFiltroAtivo && (
                  <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-9">
                    <X className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Avaliacoes ({filtradas.length}
                {temFiltroAtivo ? ` de ${avaliacoes.length}` : ""})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportarCsv(filtradas)}
                className="h-8"
              >
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              {filtradas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhuma avaliacao corresponde aos filtros
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>CEP</TableHead>
                      <TableHead>Endereco</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Sugerido</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead>PAM²/m²</TableHead>
                      <TableHead>Confianca</TableHead>
                      <TableHead className="text-right">Comparaveis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatarData(a.criado_em)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatarCep(a.cep)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {a.endereco ?? "—"}
                        </TableCell>
                        <TableCell>{a.area_interna_m2} m²</TableCell>
                        <TableCell className="font-bold text-accent">
                          {a.sugerido !== null ? formatarPreco(a.sugerido) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {a.minimo !== null && a.maximo !== null
                            ? `${formatarPreco(a.minimo)} — ${formatarPreco(a.maximo)}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {a.pam2_medio !== null
                            ? formatarPreco(Math.round(a.pam2_medio))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <ConfiancaBadge score={a.confidence_score} />
                        </TableCell>
                        <TableCell className="text-right">
                          {a.comparaveis_usados ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

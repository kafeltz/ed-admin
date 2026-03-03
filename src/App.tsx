import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { CadastrarCepPage } from "@/pages/CadastrarCepPage";
import { ImoveisPage } from "@/pages/ImoveisPage";
import { AvaliacoesPage } from "@/pages/AvaliacoesPage";
import { ConfiguracoesPage } from "@/pages/ConfiguracoesPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ceps" element={<CadastrarCepPage />} />
        <Route path="/imoveis" element={<ImoveisPage />} />
        <Route path="/avaliacoes" element={<AvaliacoesPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
      </Route>
    </Routes>
  );
}

export default App;

import { useState } from "react";
import { Header } from "./components/Header";
import { Drawer } from "./components/Drawer";
import { Wizard } from "./wizard/Wizard";
import { WizardConfirmation } from "./wizard/WizardConfirmation";
import { Inicio } from "./screens/Inicio";
import { Estoque } from "./screens/Estoque";
import { Agenda } from "./screens/Agenda";
import { Historico } from "./screens/Historico";
import { Lembretes } from "./screens/Lembretes";
import { Relatorios } from "./screens/Relatorios";
import { Configuracoes } from "./screens/Configuracoes";
import type { Screen, Tab } from "./nav";
import { useData } from "./context/DataContext";

export function AppShell() {
  const [screen, setScreen] = useState<Screen>("home");
  const [tab, setTab] = useState<Tab>("entregas");
  const [menuOpen, setMenuOpen] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const { entregas } = useData();

  const agendadasCount = entregas.filter((e) => e.status === "agendada").length;
  const hint = screen === "wizard" ? "Novo pedido" : `${agendadasCount} entregas`;

  function goToWizard() {
    setScreen("wizard");
  }

  function renderTab() {
    switch (tab) {
      case "entregas":
        return <Inicio onNovoPedido={goToWizard} />;
      case "estoque":
        return <Estoque />;
      case "agenda":
        return <Agenda onNovoPedido={goToWizard} />;
      case "historico":
        return <Historico />;
      case "lembretes":
        return <Lembretes />;
      case "relatorios":
        return <Relatorios />;
      case "config":
        return <Configuracoes />;
    }
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-dvh bg-bg font-sans text-ink flex flex-col select-none">
      <Header
        showMenuButton={screen === "home"}
        onMenuOpen={() => setMenuOpen(true)}
        hint={hint}
      />

      {screen === "home" && renderTab()}
      {screen === "wizard" && (
        <Wizard
          onExit={() => setScreen("home")}
          onDone={(message) => {
            setDoneMessage(message);
            setScreen("done");
          }}
        />
      )}
      {screen === "done" && (
        <WizardConfirmation message={doneMessage} onHome={() => setScreen("home")} />
      )}

      {menuOpen && (
        <Drawer
          activeTab={tab}
          onPick={(next) => {
            setTab(next);
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

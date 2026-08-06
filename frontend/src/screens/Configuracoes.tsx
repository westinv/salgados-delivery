import { useEffect, useState } from "react";
import { StatusPill } from "../components/StatusPill";
import { Chip } from "../components/Chip";
import { FlashModal } from "../components/FlashModal";
import { useAuth } from "../context/AuthContext";
import { useLocalStorageNumber } from "../hooks/useLocalStorageNumber";
import * as api from "../api/client";
import { ApiError } from "../api/client";

const NOTICE_CHIPS = [
  { v: 15, label: "15 min" },
  { v: 30, label: "30 min" },
  { v: 60, label: "1 hora" },
  { v: 1440, label: "1 dia" },
];

export function Configuracoes() {
  const { logout } = useAuth();
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState("");
  const [devices, setDevices] = useState("");
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [defaultNotice, setDefaultNotice] = useLocalStorageNumber(
    "defaultReminderNotice",
    30,
  );

  useEffect(() => {
    api
      .authStatus()
      .then((res) => setAuthenticated(res.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  async function handleSalvarVoice() {
    if (!token.trim() || !devices.trim()) {
      setFlash("Preencha o token e o aparelho antes de testar.");
      return;
    }
    try {
      await api.authConfigure(`${token.trim()}:${devices.trim()}`);
      setAuthenticated(true);
      setFlash("Configuração do aviso por voz salva.");
    } catch {
      setFlash("Erro ao salvar configuração.");
    }
  }

  async function handleTestarVoice() {
    if (!authenticated && (!token.trim() || !devices.trim())) {
      setFlash("Preencha o token e o aparelho antes de testar.");
      return;
    }
    try {
      await api.testarNotificacao();
      setFlash("Teste enviado. A Alexa vai falar em alguns segundos.");
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : "Erro ao enviar teste.");
    }
  }

  async function handleAlterarSenha() {
    if (!pwdCurrent || !pwdNew) {
      setFlash("Preencha a senha atual e a nova.");
      return;
    }
    if (pwdNew.length < 4) {
      setFlash("A nova senha precisa de pelo menos 4 caracteres.");
      return;
    }
    try {
      await api.alterarSenha(pwdCurrent, pwdNew);
      setPwdCurrent("");
      setPwdNew("");
      setFlash("Senha alterada.");
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : "Erro ao alterar senha.");
    }
  }

  return (
    <div className="flex-1 p-5">
      <div className="text-2xl font-extrabold leading-tight mb-4">Configurações</div>

      <div className="bg-surface rounded-card-lg p-4.5 shadow-card">
        <div className="text-[17px] font-extrabold mb-2.5">Aviso por voz na Alexa</div>
        <StatusPill tone={authenticated ? "success" : "warning"}>
          {authenticated
            ? "Aviso por voz configurado"
            : "Aviso por voz não configurado"}
        </StatusPill>
        <div className="text-sm text-muted leading-relaxed mt-3.5">
          Na Alexa, ative a skill Voice Monkey, entre no site voicemonkey.io e copie
          o token e o código do aparelho.
        </div>

        <div className="text-sm text-muted mt-4.5 mb-2">Token</div>
        <input
          type="text"
          placeholder="Cole o token aqui"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full box-border p-4 text-base border-[1.5px] border-border rounded-input bg-surface text-ink"
        />

        <div className="text-sm text-muted mt-4 mb-2">Aparelhos</div>
        <input
          type="text"
          placeholder="cozinha, sala (separe por vírgula)"
          value={devices}
          onChange={(e) => setDevices(e.target.value)}
          className="w-full box-border p-4 text-base border-[1.5px] border-border rounded-input bg-surface text-ink"
        />
        <div className="text-[13px] text-faint mt-2">
          Para mais de uma Alexa, separe os nomes por vírgula.
        </div>

        <div className="flex gap-2.5 mt-4.5">
          <button
            type="button"
            onClick={handleSalvarVoice}
            className="flex-1 text-center py-4 rounded-input bg-primary text-white text-base font-extrabold"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={handleTestarVoice}
            className="flex-1 text-center py-4 rounded-input bg-success-bg text-success-text text-base font-extrabold"
          >
            Testar voz
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-card-lg p-4.5 mt-4 shadow-card">
        <div className="text-[17px] font-extrabold mb-3">Avisos</div>
        <div className="text-sm text-muted mb-2.5">Antecedência padrão dos avisos</div>
        <div className="flex flex-wrap gap-2">
          {NOTICE_CHIPS.map((n) => (
            <Chip
              key={n.v}
              label={n.label}
              active={defaultNotice === n.v}
              onClick={() => setDefaultNotice(n.v)}
            />
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-card-lg p-4.5 mt-4 shadow-card">
        <div className="text-[17px] font-extrabold mb-3">Alterar senha</div>
        <input
          type="password"
          placeholder="Senha atual"
          value={pwdCurrent}
          onChange={(e) => setPwdCurrent(e.target.value)}
          className="w-full box-border p-4 text-base border-[1.5px] border-border rounded-input bg-surface text-ink mb-2.5"
        />
        <input
          type="password"
          placeholder="Nova senha"
          value={pwdNew}
          onChange={(e) => setPwdNew(e.target.value)}
          className="w-full box-border p-4 text-base border-[1.5px] border-border rounded-input bg-surface text-ink"
        />
        <button
          type="button"
          onClick={handleAlterarSenha}
          className="w-full mt-4 text-center py-4 rounded-input bg-header text-white text-base font-extrabold"
        >
          Alterar senha
        </button>
      </div>

      <button
        type="button"
        onClick={logout}
        className="w-full mt-4 text-center py-4 rounded-input bg-surface text-danger text-base font-bold shadow-card"
      >
        Sair do app
      </button>

      {flash && <FlashModal message={flash} onClose={() => setFlash(null)} />}
    </div>
  );
}

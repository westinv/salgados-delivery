import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export function LoginScreen() {
  const { login } = useAuth();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await login(senha);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[430px] mx-auto min-h-dvh bg-bg font-sans text-ink flex flex-col items-center justify-center px-6 py-[calc(24px+env(safe-area-inset-top))] safe-bottom select-none">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary-tint-2 flex items-center justify-center text-4xl mb-5">
            🥟
          </div>
          <h1 className="text-[26px] font-extrabold text-ink">Simone Salgados</h1>
          <p className="text-muted text-[15px] mt-2">Digite a senha para entrar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Senha"
            required
            autoFocus
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full box-border p-4 text-base text-center border-[1.5px] border-border rounded-input bg-surface text-ink focus:outline-none focus:border-primary"
          />

          {erro && (
            <div className="bg-danger-card border-[1.5px] border-danger-border rounded-chip px-4 py-3 text-danger text-[14px] text-center">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`press-feedback w-full text-center rounded-card py-4 mt-1 text-lg font-extrabold text-white ${
              loading ? "bg-disabled" : "bg-primary shadow-cta"
            }`}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

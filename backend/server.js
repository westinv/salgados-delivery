// server.js - Servidor Express principal
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const { initDatabase, tokens, usuarios, sessoes } = require("./database");
const authRoutes = require("./routes/auth");
const {
  router: entregasRoutes,
  inicializarAgendamentos,
} = require("./routes/entregas");
const estoqueRoutes = require("./routes/estoque");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Rotas da API
app.use("/auth", authRoutes);
app.use("/api/entregas", entregasRoutes);
app.use("/api/estoque", estoqueRoutes);

// Rota de health check (útil para o Render)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rotas de login
app.post("/api/login", async (req, res) => {
  try {
    const { senha } = req.body;

    if (!senha) {
      return res.status(400).json({ error: "Senha é obrigatória" });
    }

    const senhaCorreta = await usuarios.verificarSenha(senha);

    if (!senhaCorreta) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    // Cria sessão
    const sessao = await sessoes.criar();

    res.json({
      success: true,
      token: sessao.token,
      expiresAt: sessao.expiresAt,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

app.post("/api/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      await sessoes.remover(token);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao fazer logout" });
  }
});

app.get("/api/verificar-sessao", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const valida = await sessoes.verificar(token);

    res.json({ autenticado: valida });
  } catch (error) {
    res.status(500).json({ error: "Erro ao verificar sessão" });
  }
});

app.post("/api/alterar-senha", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const valida = await sessoes.verificar(token);

    if (!valida) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: "Senhas são obrigatórias" });
    }

    const senhaCorreta = await usuarios.verificarSenha(senhaAtual);

    if (!senhaCorreta) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }

    await usuarios.alterarSenha(novaSenha);

    res.json({ success: true, message: "Senha alterada com sucesso" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao alterar senha" });
  }
});

// Rota de status da autenticação
app.get("/api/auth/status", async (req, res) => {
  try {
    const tokenData = await tokens.obter();
    res.json({
      authenticated: !!tokenData && !!tokenData.access_token,
      expiresAt: tokenData?.expires_at || null,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao verificar status" });
  }
});

// Página de privacidade (placeholder para Amazon)
app.get("/privacy", (req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Política de Privacidade - Simone Salgados</title>
        </head>
        <body style="font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto;">
            <h1>Política de Privacidade</h1>
            <p>Este aplicativo coleta apenas as informações necessárias para criar lembretes na sua Alexa:</p>
            <ul>
                <li>Data e horário das entregas</li>
                <li>Descrição dos pedidos</li>
                <li>Token de acesso ao Voice Monkey (para criar anúncios)</li>
            </ul>
            <p>Seus dados são armazenados de forma segura e não são compartilhados com terceiros.</p>
        </body>
        </html>
    `);
});

// Fallback para SPA - retorna index.html para rotas não encontradas
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error("Erro:", err);
  res.status(500).json({
    error: "Erro interno do servidor",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Inicializa o banco de dados e inicia o servidor
async function startServer() {
  try {
    // Inicializa as tabelas do banco
    await initDatabase();

    // Inicializa os agendamentos de notificação
    await inicializarAgendamentos();

    // Inicia o servidor
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Frontend: http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();

// server.js - Servidor Express principal
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const entregasRoutes = require("./routes/entregas");
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

// Rota de status da autenticação
app.get("/api/auth/status", (req, res) => {
  const { tokens } = require("./database");
  const tokenData = tokens.obter();

  res.json({
    authenticated: !!tokenData && !!tokenData.access_token,
    expiresAt: tokenData?.expires_at || null,
  });
});

// Página de privacidade (placeholder para Amazon)
app.get("/privacy", (req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Política de Privacidade - Salgados Delivery</title>
        </head>
        <body style="font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto;">
            <h1>Política de Privacidade</h1>
            <p>Este aplicativo coleta apenas as informações necessárias para criar lembretes na sua Alexa:</p>
            <ul>
                <li>Data e horário das entregas</li>
                <li>Descrição dos pedidos</li>
                <li>Token de acesso à sua conta Amazon (para criar lembretes)</li>
            </ul>
            <p>Seus dados são armazenados localmente e não são compartilhados com terceiros.</p>
            <p>Contato: seu-email@exemplo.com</p>
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

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

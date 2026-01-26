// routes/auth.js - Configuração do Notify Me (Alexa Skill)
const express = require("express");
const { tokens } = require("../database");

const router = express.Router();

// GET /auth/status - Verifica se o Access Code do Notify Me está configurado
router.get("/status", (req, res) => {
  const tokenData = tokens.obter();
  const isConfigured = !!tokenData && !!tokenData.access_token;

  res.json({
    authenticated: isConfigured,
    expired: false,
    message: isConfigured
      ? "Notify Me configurado"
      : "Configure o Access Code do Notify Me",
  });
});

// POST /auth/configure - Salva o Access Code do Notify Me
router.post("/configure", (req, res) => {
  const { accessCode } = req.body;

  if (!accessCode || accessCode.trim().length === 0) {
    return res.status(400).json({ error: "Access Code é obrigatório" });
  }

  // Salva o access code (usando a tabela de tokens existente)
  tokens.salvar(accessCode.trim(), null, 999999999); // Não expira

  res.json({
    success: true,
    message: "Access Code salvo com sucesso!",
  });
});

// GET /auth/logout - Remove o Access Code
router.get("/logout", (req, res) => {
  tokens.limpar();
  res.json({ success: true, message: "Access Code removido" });
});

module.exports = router;

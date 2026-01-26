// routes/auth.js - Configuração do Voice Monkey (Alexa)
const express = require("express");
const { tokens } = require("../database");

const router = express.Router();

// GET /auth/status - Verifica se o Voice Monkey está configurado
router.get("/status", async (req, res) => {
  try {
    const tokenData = await tokens.obter();
    const isConfigured = !!tokenData && !!tokenData.access_token;

    res.json({
      authenticated: isConfigured,
      expired: false,
      message: isConfigured
        ? "Voice Monkey configurado"
        : "Configure o Token e Device ID do Voice Monkey",
    });
  } catch (error) {
    console.error("Erro ao verificar status:", error);
    res.status(500).json({ error: "Erro ao verificar status" });
  }
});

// POST /auth/configure - Salva o Token:DeviceID do Voice Monkey
router.post("/configure", async (req, res) => {
  try {
    const { accessCode } = req.body;

    if (!accessCode || accessCode.trim().length === 0) {
      return res.status(400).json({ error: "Token:DeviceID é obrigatório" });
    }

    // Salva o token (usando a tabela de tokens existente)
    await tokens.salvar(accessCode.trim(), null, 999999999); // Não expira

    res.json({
      success: true,
      message: "Configuração salva com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao configurar:", error);
    res.status(500).json({ error: "Erro ao salvar configuração" });
  }
});

// GET /auth/logout - Remove a configuração
router.get("/logout", async (req, res) => {
  try {
    await tokens.limpar();
    res.json({ success: true, message: "Configuração removida" });
  } catch (error) {
    console.error("Erro ao limpar:", error);
    res.status(500).json({ error: "Erro ao remover configuração" });
  }
});

module.exports = router;

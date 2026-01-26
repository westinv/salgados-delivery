// routes/entregas.js - CRUD de entregas + integração Voice Monkey (Alexa)
const express = require("express");
const axios = require("axios");
const { entregas, tokens } = require("../database");

const router = express.Router();

// URL da API do Voice Monkey
const VOICE_MONKEY_URL = "https://api-v2.voicemonkey.io/announcement";

// Armazena os timeouts agendados (em memória)
const agendamentos = new Map();

// Função para enviar anúncio via Voice Monkey
async function enviarAnuncio(texto) {
  const tokenData = tokens.obter();

  if (!tokenData || !tokenData.access_token) {
    throw new Error("Voice Monkey não configurado");
  }

  // O access_token contém: "token:device" (separados por :)
  const [token, device] = tokenData.access_token.split(":");

  if (!token || !device) {
    throw new Error("Configuração inválida. Use o formato: TOKEN:DEVICE_ID");
  }

  console.log("Enviando anúncio para Alexa:", texto);

  try {
    const response = await axios.get(VOICE_MONKEY_URL, {
      params: {
        token: token,
        device: device,
        text: texto,
        voice: "Vitoria", // Voz brasileira
        language: "pt-BR",
      },
    });

    console.log("Anúncio enviado com sucesso:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao enviar anúncio:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

// Função para agendar notificação
function agendarNotificacao(entrega) {
  const dataHoraEntrega = new Date(`${entrega.data}T${entrega.horario}:00`);
  const dataHoraAviso = new Date(
    dataHoraEntrega.getTime() - entrega.antecedencia_minutos * 60 * 1000,
  );
  const agora = new Date();

  const tempoAteAviso = dataHoraAviso.getTime() - agora.getTime();

  if (tempoAteAviso <= 0) {
    console.log(
      `Aviso para entrega ${entrega.id} já passou, ignorando agendamento`,
    );
    return null;
  }

  console.log(
    `Agendando notificação para entrega ${entrega.id} em ${Math.round(tempoAteAviso / 60000)} minutos`,
  );

  const timeout = setTimeout(async () => {
    try {
      const texto = `Atenção! Em ${entrega.antecedencia_minutos} minutos você tem uma entrega: ${entrega.descricao}`;
      await enviarAnuncio(texto);
      agendamentos.delete(entrega.id);
    } catch (error) {
      console.error(
        `Erro ao enviar notificação da entrega ${entrega.id}:`,
        error.message,
      );
    }
  }, tempoAteAviso);

  agendamentos.set(entrega.id, timeout);
  return timeout;
}

// Função para cancelar agendamento
function cancelarAgendamento(entregaId) {
  const timeout = agendamentos.get(entregaId);
  if (timeout) {
    clearTimeout(timeout);
    agendamentos.delete(entregaId);
    console.log(`Agendamento da entrega ${entregaId} cancelado`);
  }
}

// Ao iniciar, reagenda todas as entregas pendentes
function reagendarEntregasPendentes() {
  const lista = entregas.listar();
  const agora = new Date();

  lista.forEach((entrega) => {
    if (entrega.status === "agendada") {
      const dataHoraEntrega = new Date(`${entrega.data}T${entrega.horario}:00`);
      if (dataHoraEntrega > agora) {
        agendarNotificacao(entrega);
      }
    }
  });

  console.log(`${agendamentos.size} entregas reagendadas`);
}

reagendarEntregasPendentes();

// Verifica entregas para auto-concluir (2h após horário)
function verificarAutoConclusao() {
  const lista = entregas.buscarParaAutoConcluir();
  const agora = new Date();

  lista.forEach((entrega) => {
    const dataHoraEntrega = new Date(`${entrega.data}T${entrega.horario}:00`);
    const duasHorasDepois = new Date(
      dataHoraEntrega.getTime() + 2 * 60 * 60 * 1000,
    );

    if (agora >= duasHorasDepois) {
      console.log(
        `Auto-marcando entrega ${entrega.id} como ATENÇÃO (passou 2h)`,
      );
      entregas.marcarAtencao(entrega.id);
      cancelarAgendamento(entrega.id);
    }
  });
}

// Executa verificação a cada 5 minutos
setInterval(verificarAutoConclusao, 5 * 60 * 1000);
verificarAutoConclusao(); // Executa imediatamente ao iniciar

// GET /api/entregas - Lista todas as entregas
router.get("/", (req, res) => {
  try {
    const lista = entregas.listar();
    res.json(lista);
  } catch (error) {
    console.error("Erro ao listar entregas:", error);
    res.status(500).json({ error: "Erro ao listar entregas" });
  }
});

// GET /api/entregas/:id - Busca entrega por ID
router.get("/:id", (req, res) => {
  try {
    const entrega = entregas.buscarPorId(req.params.id);
    if (!entrega) {
      return res.status(404).json({ error: "Entrega não encontrada" });
    }
    res.json(entrega);
  } catch (error) {
    console.error("Erro ao buscar entrega:", error);
    res.status(500).json({ error: "Erro ao buscar entrega" });
  }
});

// POST /api/entregas - Cria nova entrega
router.post("/", async (req, res) => {
  try {
    const { data, horario, descricao, antecedencia_minutos } = req.body;

    if (!data || !horario || !descricao) {
      return res.status(400).json({
        error: "Campos obrigatórios: data, horario, descricao",
      });
    }

    const dataHoraEntrega = new Date(`${data}T${horario}:00`);
    const agora = new Date();

    if (dataHoraEntrega <= agora) {
      return res.status(400).json({
        error: "A data/hora da entrega deve ser no futuro",
      });
    }

    const novaEntrega = entregas.criar({
      data,
      horario,
      descricao,
      antecedencia_minutos: antecedencia_minutos || 30,
    });

    const tokenData = tokens.obter();
    const voiceMonkeyConfigurado = !!tokenData?.access_token;

    let agendado = false;
    if (voiceMonkeyConfigurado) {
      agendarNotificacao({
        ...novaEntrega,
        antecedencia_minutos: antecedencia_minutos || 30,
      });
      agendado = true;
    }

    res.status(201).json({
      success: true,
      entrega: novaEntrega,
      alexa: {
        success: agendado,
        configured: voiceMonkeyConfigurado,
        message: voiceMonkeyConfigurado
          ? "Notificação agendada!"
          : "Configure o Voice Monkey para receber avisos na Alexa",
      },
    });
  } catch (error) {
    console.error("Erro ao criar entrega:", error);
    res.status(500).json({ error: "Erro ao criar entrega" });
  }
});

// DELETE /api/entregas/:id - Remove entrega
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const entrega = entregas.buscarPorId(id);
    if (!entrega) {
      return res.status(404).json({ error: "Entrega não encontrada" });
    }

    cancelarAgendamento(parseInt(id));
    entregas.remover(id);

    res.json({ success: true, message: "Entrega removida" });
  } catch (error) {
    console.error("Erro ao remover entrega:", error);
    res.status(500).json({ error: "Erro ao remover entrega" });
  }
});

// POST /api/entregas/:id/concluir - Marca entrega como concluída
router.post("/:id/concluir", async (req, res) => {
  try {
    const { id } = req.params;

    const entrega = entregas.buscarPorId(id);
    if (!entrega) {
      return res.status(404).json({ error: "Entrega não encontrada" });
    }

    cancelarAgendamento(parseInt(id));
    entregas.concluir(id);

    res.json({ success: true, message: "Entrega marcada como concluída" });
  } catch (error) {
    console.error("Erro ao concluir entrega:", error);
    res.status(500).json({ error: "Erro ao concluir entrega" });
  }
});

// POST /api/entregas/testar-notificacao - Envia notificação de teste
router.post("/testar-notificacao", async (req, res) => {
  try {
    await enviarAnuncio(
      "Teste do sistema Salgados Delivery! Se você ouviu isso, a integração está funcionando perfeitamente.",
    );
    res.json({ success: true, message: "Anúncio de teste enviado!" });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

// routes/lembretes.js - CRUD de lembretes + integração Alexa
const express = require("express");
const { lembretes, tokens } = require("../database");
const { enviarAnuncio } = require("../services/alexa");

const router = express.Router();

// Armazena os timeouts agendados (em memória)
const agendamentosLembretes = new Map();

// Função para agendar notificação de lembrete
function agendarNotificacaoLembrete(lembrete) {
  // Interpreta a data/hora como horário de Brasília (UTC-3)
  const dataHoraLembrete = new Date(
    `${lembrete.data}T${lembrete.horario}:00-03:00`,
  );
  const dataHoraAviso = new Date(
    dataHoraLembrete.getTime() - lembrete.antecedencia_minutos * 60 * 1000,
  );
  const agora = new Date();

  const tempoAteAviso = dataHoraAviso.getTime() - agora.getTime();

  if (tempoAteAviso <= 0) {
    console.log(
      `Aviso para lembrete ${lembrete.id} já passou, ignorando agendamento`,
    );
    return null;
  }

  console.log(
    `Agendando notificação para lembrete ${lembrete.id} em ${Math.round(tempoAteAviso / 60000)} minutos`,
  );

  const timeout = setTimeout(async () => {
    try {
      const texto = `Lembrete! Em ${lembrete.antecedencia_minutos} minutos: ${lembrete.descricao}`;
      await enviarAnuncio(texto);
      agendamentosLembretes.delete(lembrete.id);
    } catch (error) {
      console.error(
        `Erro ao enviar notificação do lembrete ${lembrete.id}:`,
        error.message,
      );
    }
  }, tempoAteAviso);

  agendamentosLembretes.set(lembrete.id, timeout);
  return timeout;
}

// Função para cancelar agendamento
function cancelarAgendamentoLembrete(lembreteId) {
  const timeout = agendamentosLembretes.get(lembreteId);
  if (timeout) {
    clearTimeout(timeout);
    agendamentosLembretes.delete(lembreteId);
    console.log(`Agendamento do lembrete ${lembreteId} cancelado`);
  }
}

// Ao iniciar, reagenda todos os lembretes pendentes
async function reagendarLembretesPendentes() {
  const lista = await lembretes.listar();
  const agora = new Date();

  lista.forEach((lembrete) => {
    if (lembrete.status === "agendado") {
      const dataHoraLembrete = new Date(
        `${lembrete.data}T${lembrete.horario}:00-03:00`,
      );
      if (dataHoraLembrete > agora) {
        agendarNotificacaoLembrete(lembrete);
      }
    }
  });

  console.log(`${agendamentosLembretes.size} lembretes reagendados`);
}

// Verifica lembretes para auto-concluir (2h após horário)
async function verificarAutoConclusaoLembretes() {
  const lista = await lembretes.buscarParaAutoConcluir();
  const agora = new Date();

  for (const lembrete of lista) {
    const dataHoraLembrete = new Date(
      `${lembrete.data}T${lembrete.horario}:00-03:00`,
    );
    const duasHorasDepois = new Date(
      dataHoraLembrete.getTime() + 2 * 60 * 60 * 1000,
    );

    if (agora >= duasHorasDepois) {
      console.log(
        `Auto-marcando lembrete ${lembrete.id} como concluido (passou 2h)`,
      );
      await lembretes.concluir(lembrete.id);
      cancelarAgendamentoLembrete(lembrete.id);
    }
  }
}

// Função de inicialização
async function inicializarAgendamentosLembretes() {
  await reagendarLembretesPendentes();
  await verificarAutoConclusaoLembretes();
  // Executa verificação a cada 5 minutos
  setInterval(verificarAutoConclusaoLembretes, 5 * 60 * 1000);
}

// GET /api/lembretes - Lista todos os lembretes
router.get("/", async (req, res) => {
  try {
    const lista = await lembretes.listar();
    res.json(lista);
  } catch (error) {
    console.error("Erro ao listar lembretes:", error);
    res.status(500).json({ error: "Erro ao listar lembretes" });
  }
});

// POST /api/lembretes - Cria novo lembrete
router.post("/", async (req, res) => {
  try {
    const { data, horario, descricao, antecedencia_minutos } = req.body;

    if (!data || !horario || !descricao) {
      return res.status(400).json({
        error: "Campos obrigatórios: data, horario, descricao",
      });
    }

    const dataHoraLembrete = new Date(`${data}T${horario}:00-03:00`);
    const agora = new Date();
    const cincoMinutos = 5 * 60 * 1000;

    if (dataHoraLembrete.getTime() <= agora.getTime() + cincoMinutos) {
      return res.status(400).json({
        error:
          "O lembrete deve ser agendado com pelo menos 5 minutos de antecedência",
      });
    }

    const novoLembrete = await lembretes.criar({
      data,
      horario,
      descricao,
      antecedencia_minutos: antecedencia_minutos || 30,
    });

    const tokenData = await tokens.obter();
    const voiceMonkeyConfigurado = !!tokenData?.access_token;

    let agendado = false;
    if (voiceMonkeyConfigurado) {
      agendarNotificacaoLembrete({
        ...novoLembrete,
        antecedencia_minutos: antecedencia_minutos || 30,
      });
      agendado = true;
    }

    res.status(201).json({
      success: true,
      lembrete: novoLembrete,
      alexa: {
        success: agendado,
        configured: voiceMonkeyConfigurado,
      },
    });
  } catch (error) {
    console.error("Erro ao criar lembrete:", error);
    res.status(500).json({ error: "Erro ao criar lembrete" });
  }
});

// DELETE /api/lembretes/:id - Remove lembrete
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const lembrete = await lembretes.buscarPorId(id);
    if (!lembrete) {
      return res.status(404).json({ error: "Lembrete não encontrado" });
    }

    cancelarAgendamentoLembrete(parseInt(id));
    await lembretes.remover(id);

    res.json({ success: true, message: "Lembrete removido" });
  } catch (error) {
    console.error("Erro ao remover lembrete:", error);
    res.status(500).json({ error: "Erro ao remover lembrete" });
  }
});

// POST /api/lembretes/:id/concluir - Marca lembrete como concluído
router.post("/:id/concluir", async (req, res) => {
  try {
    const { id } = req.params;

    const lembrete = await lembretes.buscarPorId(id);
    if (!lembrete) {
      return res.status(404).json({ error: "Lembrete não encontrado" });
    }

    cancelarAgendamentoLembrete(parseInt(id));
    await lembretes.concluir(id);

    res.json({ success: true, message: "Lembrete concluído" });
  } catch (error) {
    console.error("Erro ao concluir lembrete:", error);
    res.status(500).json({ error: "Erro ao concluir lembrete" });
  }
});

module.exports = { router, inicializarAgendamentosLembretes };

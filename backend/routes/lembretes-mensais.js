// routes/lembretes-mensais.js - CRUD de lembretes mensais recorrentes
const express = require("express");
const { lembretesMensais, lembretes, tokens } = require("../database");
const { enviarAnuncio } = require("../services/alexa");

const router = express.Router();

// Calcula a data da próxima ocorrência do lembrete mensal
function calcularProximaData(diaDoMes) {
  const agora = new Date();
  // Usa horário de Brasília
  const agoraBR = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

  let ano = agoraBR.getFullYear();
  let mes = agoraBR.getMonth(); // 0-indexed

  // Se o dia já passou neste mês, usa o próximo mês
  if (agoraBR.getDate() > diaDoMes) {
    mes++;
    if (mes > 11) {
      mes = 0;
      ano++;
    }
  }

  // Ajusta para o último dia do mês se o dia não existe
  const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
  const diaFinal = Math.min(diaDoMes, ultimoDiaMes);

  const mesStr = String(mes + 1).padStart(2, "0");
  const diaStr = String(diaFinal).padStart(2, "0");

  return `${ano}-${mesStr}-${diaStr}`;
}

// Calcula a data para o mês atual (independente se já passou)
function calcularDataMesAtual(diaDoMes) {
  const agora = new Date();
  const agoraBR = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

  const ano = agoraBR.getFullYear();
  const mes = agoraBR.getMonth();

  const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
  const diaFinal = Math.min(diaDoMes, ultimoDiaMes);

  const mesStr = String(mes + 1).padStart(2, "0");
  const diaStr = String(diaFinal).padStart(2, "0");

  return `${ano}-${mesStr}-${diaStr}`;
}

// Gera o lembrete avulso para um lembrete mensal (se ainda não existe)
async function gerarLembreteAvulso(lembreteMensal) {
  // Calcula data para o mês atual
  const dataMesAtual = calcularDataMesAtual(lembreteMensal.dia_do_mes);
  const dataProxima = calcularProximaData(lembreteMensal.dia_do_mes);

  // Verifica se já existe lembrete pendente para este mensal
  const pendentes = await lembretes.buscarPendentesPorMensalId(lembreteMensal.id);

  if (pendentes.length > 0) {
    // Já existe lembrete pendente, não precisa criar
    return null;
  }

  // Decide qual data usar: mês atual (se ainda não passou) ou próximo mês
  const agora = new Date();
  const agoraBR = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

  const dataHoraAtual = new Date(
    `${dataMesAtual}T${lembreteMensal.horario}:00-03:00`
  );

  // Se já passou no mês atual + 2h, usa próximo mês
  const duasHoras = 2 * 60 * 60 * 1000;
  let dataFinal;
  if (agora.getTime() > dataHoraAtual.getTime() + duasHoras) {
    dataFinal = dataProxima;
  } else {
    dataFinal = dataMesAtual;
  }

  // Verifica se a data final já é no passado (mais de 2h)
  const dataHoraFinal = new Date(`${dataFinal}T${lembreteMensal.horario}:00-03:00`);
  if (agora.getTime() > dataHoraFinal.getTime() + duasHoras) {
    return null; // Não cria se já passou muito
  }

  // Cria o lembrete avulso
  const novoLembrete = await lembretes.criar({
    data: dataFinal,
    horario: lembreteMensal.horario,
    descricao: `📅 ${lembreteMensal.descricao}`,
    antecedencia_minutos: lembreteMensal.antecedencia_minutos,
    lembrete_mensal_id: lembreteMensal.id,
  });

  console.log(
    `Lembrete avulso ${novoLembrete.id} criado para mensal ${lembreteMensal.id} (${lembreteMensal.descricao}) em ${dataFinal}`
  );

  return novoLembrete;
}

// Verifica e gera lembretes avulsos para todos os mensais ativos
async function sincronizarLembretesMensais() {
  try {
    const mensaisAtivos = await lembretesMensais.listarAtivos();

    for (const mensal of mensaisAtivos) {
      await gerarLembreteAvulso(mensal);
    }

    console.log(`Sincronização de ${mensaisAtivos.length} lembretes mensais concluída`);
  } catch (error) {
    console.error("Erro ao sincronizar lembretes mensais:", error.message);
  }
}

// Inicialização
async function inicializarLembretesMensais() {
  await sincronizarLembretesMensais();
  // Verifica a cada 1 hora
  setInterval(sincronizarLembretesMensais, 60 * 60 * 1000);
}

// GET /api/lembretes-mensais - Lista todos
router.get("/", async (req, res) => {
  try {
    const lista = await lembretesMensais.listar();
    res.json(lista);
  } catch (error) {
    console.error("Erro ao listar lembretes mensais:", error);
    res.status(500).json({ error: "Erro ao listar lembretes mensais" });
  }
});

// POST /api/lembretes-mensais - Cria novo
router.post("/", async (req, res) => {
  try {
    const { descricao, dia_do_mes, horario, antecedencia_minutos } = req.body;

    if (!descricao || !dia_do_mes || !horario) {
      return res.status(400).json({
        error: "Campos obrigatórios: descricao, dia_do_mes, horario",
      });
    }

    const dia = parseInt(dia_do_mes);
    if (dia < 1 || dia > 31) {
      return res.status(400).json({
        error: "O dia do mês deve estar entre 1 e 31",
      });
    }

    const novoMensal = await lembretesMensais.criar({
      descricao,
      dia_do_mes: dia,
      horario,
      antecedencia_minutos: antecedencia_minutos || 30,
    });

    // Gera o primeiro lembrete avulso
    const lembreteAvulso = await gerarLembreteAvulso(novoMensal);

    // Se existe lembrete avulso, tenta agendar notificação
    if (lembreteAvulso) {
      // Importa a função de agendamento do lembretes.js
      try {
        const { agendarNotificacaoLembrete } = require("./lembretes");
        const tokenData = await tokens.obter();
        if (tokenData?.access_token) {
          agendarNotificacaoLembrete({
            ...lembreteAvulso,
            antecedencia_minutos: antecedencia_minutos || 30,
          });
        }
      } catch (e) {
        // Se não conseguir agendar, tudo bem - será reagendado na próxima inicialização
      }
    }

    res.status(201).json({
      success: true,
      lembreteMensal: novoMensal,
      lembreteAvulso,
    });
  } catch (error) {
    console.error("Erro ao criar lembrete mensal:", error);
    res.status(500).json({ error: "Erro ao criar lembrete mensal" });
  }
});

// PUT /api/lembretes-mensais/:id - Edita lembrete mensal
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, dia_do_mes, horario, antecedencia_minutos } = req.body;

    const existente = await lembretesMensais.buscarPorId(id);
    if (!existente) {
      return res.status(404).json({ error: "Lembrete mensal não encontrado" });
    }

    const dia = parseInt(dia_do_mes);
    if (dia < 1 || dia > 31) {
      return res.status(400).json({
        error: "O dia do mês deve estar entre 1 e 31",
      });
    }

    await lembretesMensais.atualizar(id, {
      descricao,
      dia_do_mes: dia,
      horario,
      antecedencia_minutos: antecedencia_minutos || 30,
    });

    // Remove lembretes avulsos pendentes antigos e gera novo
    await lembretes.removerPorMensalId(parseInt(id));

    if (existente.ativo) {
      const atualizado = await lembretesMensais.buscarPorId(id);
      await gerarLembreteAvulso(atualizado);
    }

    res.json({ success: true, message: "Lembrete mensal atualizado" });
  } catch (error) {
    console.error("Erro ao atualizar lembrete mensal:", error);
    res.status(500).json({ error: "Erro ao atualizar lembrete mensal" });
  }
});

// DELETE /api/lembretes-mensais/:id - Remove
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existente = await lembretesMensais.buscarPorId(id);
    if (!existente) {
      return res.status(404).json({ error: "Lembrete mensal não encontrado" });
    }

    // Remove lembretes avulsos pendentes ligados a este mensal
    await lembretes.removerPorMensalId(parseInt(id));

    // Remove o mensal
    await lembretesMensais.remover(id);

    res.json({ success: true, message: "Lembrete mensal removido" });
  } catch (error) {
    console.error("Erro ao remover lembrete mensal:", error);
    res.status(500).json({ error: "Erro ao remover lembrete mensal" });
  }
});

// POST /api/lembretes-mensais/:id/pausar - Toggle ativo/inativo
router.post("/:id/pausar", async (req, res) => {
  try {
    const { id } = req.params;

    const existente = await lembretesMensais.buscarPorId(id);
    if (!existente) {
      return res.status(404).json({ error: "Lembrete mensal não encontrado" });
    }

    if (existente.ativo) {
      await lembretesMensais.pausar(id);
      // Remove lembretes avulsos pendentes
      await lembretes.removerPorMensalId(parseInt(id));
      res.json({ success: true, ativo: false, message: "Lembrete pausado" });
    } else {
      await lembretesMensais.ativar(id);
      // Gera lembrete avulso
      const atualizado = await lembretesMensais.buscarPorId(id);
      await gerarLembreteAvulso(atualizado);
      res.json({ success: true, ativo: true, message: "Lembrete ativado" });
    }
  } catch (error) {
    console.error("Erro ao pausar/ativar lembrete mensal:", error);
    res.status(500).json({ error: "Erro ao pausar/ativar lembrete mensal" });
  }
});

module.exports = { router, inicializarLembretesMensais };

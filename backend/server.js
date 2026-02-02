// server.js - Servidor Express principal
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const {
  initDatabase,
  tokens,
  usuarios,
  sessoes,
  entregas,
  estoque,
  itensPedido,
} = require("./database");
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

// Rota de relatórios
app.get("/api/relatorios", async (req, res) => {
  try {
    const { periodo, mes, ano } = req.query; // hoje, semana, mes, mes-especifico

    const hoje = new Date();
    let dataInicio;
    let dataFim;

    if (periodo === "hoje") {
      dataInicio = hoje.toISOString().split("T")[0];
      dataFim = dataInicio;
    } else if (periodo === "semana") {
      const semanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
      dataInicio = semanaAtras.toISOString().split("T")[0];
      dataFim = hoje.toISOString().split("T")[0];
    } else if (periodo === "mes-especifico" && mes && ano) {
      // Mês específico selecionado pelo usuário
      const mesNum = parseInt(mes);
      const anoNum = parseInt(ano);
      dataInicio = `${anoNum}-${String(mesNum).padStart(2, "0")}-01`;
      // Último dia do mês
      const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
      dataFim = `${anoNum}-${String(mesNum).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
    } else {
      // mes atual (primeiro ao último dia do mês corrente)
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();
      dataInicio = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-01`;
      const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();
      dataFim = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
    }

    // Busca entregas concluídas no período
    const todasEntregas = await entregas.listar();
    const entregasPeriodo = todasEntregas.filter(
      (e) =>
        e.status === "concluida" && e.data >= dataInicio && e.data <= dataFim,
    );

    // Conta entregas por dia
    const porDia = {};
    entregasPeriodo.forEach((e) => {
      if (!porDia[e.data]) porDia[e.data] = 0;
      porDia[e.data]++;
    });

    // Busca itens de cada entrega e calcula totais
    const salgadosCount = {};
    let totalVendas = 0;

    for (const entrega of entregasPeriodo) {
      const itens = await itensPedido.listarPorEntrega(entrega.id);

      for (const item of itens) {
        // Conta quantidade por produto
        const nome = item.nome.toLowerCase();
        if (!salgadosCount[nome]) salgadosCount[nome] = 0;
        salgadosCount[nome] += item.quantidade;

        // Calcula valor total
        totalVendas += item.quantidade * (item.preco_unitario || 0);
      }
    }

    // Ordena mais vendidos
    const maisVendidos = Object.entries(salgadosCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, qtd]) => ({ nome, quantidade: qtd }));

    // Converte porDia para array ordenado por data
    const porDiaArray = Object.entries(porDia)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([data, quantidade]) => ({
        data: new Date(data + "T12:00:00").toLocaleDateString("pt-BR"),
        quantidade,
      }));

    // Busca estoque baixo
    const estoqueAtual = await estoque.listar();
    const estoqueBaixo = estoqueAtual
      .filter((i) => i.quantidade <= 10)
      .map((i) => ({ nome: i.nome, quantidade: i.quantidade }));

    res.json({
      totalEntregas: entregasPeriodo.length,
      totalVendas,
      porDia: porDiaArray,
      maisVendidos,
      estoqueBaixo,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

// Rota de estoque baixo
app.get("/api/estoque-baixo", async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 10;
    const estoqueAtual = await estoque.listar();
    const baixo = estoqueAtual.filter((i) => i.quantidade <= limite);
    res.json(baixo);
  } catch (error) {
    res.status(500).json({ error: "Erro ao verificar estoque" });
  }
});

// Rota para notificar estoque baixo via Alexa
app.post("/api/notificar-estoque-baixo", async (req, res) => {
  try {
    const limite = parseInt(req.body.limite) || 10;
    const estoqueAtual = await estoque.listar();
    const baixo = estoqueAtual.filter((i) => i.quantidade <= limite);

    if (baixo.length === 0) {
      return res.json({
        success: true,
        message: "Nenhum item com estoque baixo",
      });
    }

    const tokenData = await tokens.obter();
    if (!tokenData || !tokenData.access_token) {
      return res.status(400).json({ error: "Voice Monkey não configurado" });
    }

    const [token, device] = tokenData.access_token.split(":");

    const itensTexto = baixo
      .map((i) => `${i.nome}: ${i.quantidade} unidades`)
      .join(". ");
    const texto = `Atenção! Estoque baixo dos seguintes itens: ${itensTexto}`;

    const axios = require("axios");
    await axios.post("https://api-v2.voicemonkey.io/announcement", {
      token,
      device,
      text: texto,
    });

    res.json({ success: true, message: "Notificação enviada!" });
  } catch (error) {
    console.error("Erro ao notificar estoque baixo:", error);
    res.status(500).json({ error: "Erro ao enviar notificação" });
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

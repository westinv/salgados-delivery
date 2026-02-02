// app.js - Lógica principal do PWA Salgados Delivery

const API_BASE = window.location.origin;

// ==================== AUTENTICAÇÃO ====================

let tokenSessao = localStorage.getItem("sessaoToken");

async function verificarSessao() {
  if (!tokenSessao) {
    mostrarLogin();
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/api/verificar-sessao`, {
      headers: { Authorization: `Bearer ${tokenSessao}` },
    });
    const data = await response.json();

    if (data.autenticado) {
      esconderLogin();
      return true;
    } else {
      localStorage.removeItem("sessaoToken");
      tokenSessao = null;
      mostrarLogin();
      return false;
    }
  } catch (error) {
    mostrarLogin();
    return false;
  }
}

function mostrarLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
}

function esconderLogin() {
  document.getElementById("login-screen").classList.add("hidden");
}

async function fazerLogin(senha) {
  try {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      tokenSessao = data.token;
      localStorage.setItem("sessaoToken", tokenSessao);
      esconderLogin();
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function fazerLogout() {
  try {
    await fetch(`${API_BASE}/api/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenSessao}` },
    });
  } catch (error) {
    // ignora erro
  }

  localStorage.removeItem("sessaoToken");
  tokenSessao = null;
  mostrarLogin();
}

async function alterarSenha(senhaAtual, novaSenha) {
  try {
    const response = await fetch(`${API_BASE}/api/alterar-senha`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenSessao}`,
      },
      body: JSON.stringify({ senhaAtual, novaSenha }),
    });

    const data = await response.json();
    return { success: response.ok, message: data.message || data.error };
  } catch (error) {
    return { success: false, message: "Erro de conexão" };
  }
}

const elements = {
  form: document.getElementById("form-entrega"),
  formEstoque: document.getElementById("form-estoque"),
  btnRefresh: document.getElementById("btn-refresh"),
  btnRefreshHistorico: document.getElementById("btn-refresh-historico"),
  btnSalvar: document.getElementById("btn-salvar"),
  loading: document.getElementById("loading"),
  authStatus: document.getElementById("auth-status"),
  listaEntregas: document.getElementById("lista-entregas"),
  listaVazia: document.getElementById("lista-vazia"),
  listaHistorico: document.getElementById("lista-historico"),
  historicoVazio: document.getElementById("historico-vazio"),
  listaEstoque: document.getElementById("lista-estoque"),
  estoqueVazio: document.getElementById("estoque-vazio"),
  estoqueResumo: document.getElementById("estoque-resumo"),
  itensDisponiveis: document.getElementById("itens-disponiveis"),
  itensSelecionados: document.getElementById("itens-selecionados"),
  toast: document.getElementById("toast"),
  pageTitle: document.getElementById("page-title"),
  sidebar: document.getElementById("sidebar"),
  overlay: document.getElementById("overlay"),
  inputToken: document.getElementById("input-token"),
  inputDevice: document.getElementById("input-device"),
  btnSalvarConfig: document.getElementById("btn-salvar-config"),
  btnTestar: document.getElementById("btn-testar"),
  data: document.getElementById("data"),
  horario: document.getElementById("horario"),
  descricao: document.getElementById("descricao"),
  antecedencia: document.getElementById("antecedencia"),
  // Estoque form
  estoqueNome: document.getElementById("estoque-nome"),
  estoqueQuantidade: document.getElementById("estoque-quantidade"),
  estoquePreco: document.getElementById("estoque-preco"),
};

let isConfigured = false;
let entregas = [];
let estoqueItems = [];
let itensSelecionados = []; // Array de {id, nome, quantidade, maxQtd}
let filtroAtual = "todos";
let paginaAtual = "home";
let embalagemTipo = "nenhuma"; // nenhuma, tapper, isopor
let embalagemQtd = 1;

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  // Verifica sessão primeiro
  const logado = await verificarSessao();

  if (logado) {
    await inicializarApp();
  }

  // Event listener do form de login
  document
    .getElementById("form-login")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const senha = document.getElementById("login-senha").value;
      const erroEl = document.getElementById("login-erro");

      const sucesso = await fazerLogin(senha);

      if (sucesso) {
        erroEl.classList.add("hidden");
        document.getElementById("login-senha").value = "";
        await inicializarApp();
      } else {
        erroEl.textContent = "Senha incorreta";
        erroEl.classList.remove("hidden");
      }
    });

  // Event listener do botão de logout
  document.getElementById("btn-logout").addEventListener("click", async () => {
    if (confirm("Deseja sair do app?")) {
      await fazerLogout();
    }
  });

  // Event listener do form de alterar senha
  document
    .getElementById("form-alterar-senha")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const senhaAtual = document.getElementById("senha-atual").value;
      const novaSenha = document.getElementById("senha-nova").value;

      if (novaSenha.length < 4) {
        showToast("A nova senha deve ter pelo menos 4 caracteres", "error");
        return;
      }

      const result = await alterarSenha(senhaAtual, novaSenha);

      if (result.success) {
        showToast("Senha alterada com sucesso!", "success");
        document.getElementById("form-alterar-senha").reset();
      } else {
        showToast(result.message, "error");
      }
    });

  registerServiceWorker();
});

async function inicializarApp() {
  elements.data.min = new Date().toISOString().split("T")[0];
  elements.data.value = elements.data.min;

  await checkAuthStatus();
  await carregarEstoque();
  await carregarEntregas();
}

// Event Listeners
elements.form.addEventListener("submit", handleSubmit);
elements.formEstoque.addEventListener("submit", handleEstoqueSubmit);
elements.btnRefresh.addEventListener("click", carregarEntregas);
elements.btnRefreshHistorico.addEventListener("click", carregarEntregas);
elements.btnSalvarConfig.addEventListener("click", salvarConfig);
elements.btnTestar.addEventListener("click", testarNotificacao);

// Sidebar
window.toggleSidebar = function () {
  elements.sidebar.classList.toggle("open");
  elements.overlay.classList.toggle("open");
};

// Navegação de páginas
window.showPage = function (page) {
  paginaAtual = page;
  document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));
  document.getElementById(`page-${page}`).classList.remove("hidden");

  document.querySelectorAll(".menu-item").forEach((item) => {
    item.classList.remove("bg-orange-100", "text-orange-600");
    if (item.dataset.page === page) {
      item.classList.add("bg-orange-100", "text-orange-600");
    }
  });

  const titulos = {
    home: "🥟 Simone Salgados",
    estoque: "📦 Estoque",
    agenda: "📅 Agenda",
    historico: "📋 Histórico",
    relatorios: "📊 Relatórios",
    config: "⚙️ Configurações",
  };
  elements.pageTitle.textContent = titulos[page] || "🥟 Simone Salgados";

  toggleSidebar();

  if (page === "historico") renderHistorico();
  if (page === "estoque") renderEstoque();
  if (page === "home") renderItensDisponiveis();
  if (page === "agenda") carregarAgenda();
  if (page === "relatorios") carregarRelatorios();
};

// ==================== AGENDA (PEDIDOS FUTUROS) ====================

window.carregarAgenda = async function () {
  const timeline = document.getElementById("agenda-timeline");
  const vazio = document.getElementById("agenda-vazia");

  // Filtra apenas entregas agendadas (futuras)
  const agendadas = entregas.filter((e) => e.status === "agendada");

  if (agendadas.length === 0) {
    timeline.innerHTML = "";
    vazio.classList.remove("hidden");
    return;
  }

  vazio.classList.add("hidden");

  // Agrupa por data
  const porData = {};
  agendadas.forEach((entrega) => {
    if (!porData[entrega.data]) {
      porData[entrega.data] = [];
    }
    porData[entrega.data].push(entrega);
  });

  // Ordena datas
  const datasOrdenadas = Object.keys(porData).sort();

  // Renderiza timeline
  timeline.innerHTML = datasOrdenadas
    .map((data) => {
      const entregasDoDia = porData[data].sort((a, b) =>
        a.horario.localeCompare(b.horario),
      );
      const dataFormatada = formatarDataCompleta(data);
      const isHoje = data === new Date().toISOString().split("T")[0];
      const isAmanha =
        data === new Date(Date.now() + 86400000).toISOString().split("T")[0];

      let label = dataFormatada;
      if (isHoje) label = `Hoje - ${dataFormatada}`;
      if (isAmanha) label = `Amanhã - ${dataFormatada}`;

      return `
      <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <div class="bg-gradient-to-r ${isHoje ? "from-orange-500 to-orange-600" : "from-gray-600 to-gray-700"} text-white px-4 py-3">
          <p class="font-bold text-lg">${label}</p>
          <p class="text-sm opacity-80">${entregasDoDia.length} entrega${entregasDoDia.length > 1 ? "s" : ""}</p>
        </div>
        <div class="divide-y divide-gray-100">
          ${entregasDoDia
            .map(
              (entrega) => `
            <div class="p-4 flex items-start gap-4">
              <div class="flex-shrink-0 w-16 text-center">
                <p class="text-2xl font-bold text-orange-500">${entrega.horario.substring(0, 5)}</p>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-800 break-words">${escapeHtml(entrega.descricao)}</p>
                <p class="text-xs text-gray-400 mt-1">Aviso ${entrega.antecedencia_minutos} min antes</p>
              </div>
              <div class="flex-shrink-0 flex gap-1">
                <button onclick="concluirEntrega(${entrega.id})" class="p-2 text-green-500 hover:bg-green-50 rounded-lg">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </button>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
    })
    .join("");
};

// ==================== RELATÓRIOS ====================

let periodoAtual = "hoje";
let limiteEstoque = parseInt(localStorage.getItem("limiteEstoque")) || 10;

async function carregarRelatorios() {
  // Carrega limite salvo
  document.getElementById("limite-estoque").value = limiteEstoque;

  await atualizarRelatorio();
  await carregarEstoqueBaixo();
}

window.filtrarRelatorio = async function (periodo) {
  periodoAtual = periodo;

  // Esconde seletor de mês quando seleciona outro período
  document.getElementById("seletor-mes").classList.add("hidden");

  // Atualiza visual dos botões
  document.querySelectorAll(".periodo-btn").forEach((btn) => {
    btn.classList.remove("bg-orange-500", "text-white");
    btn.classList.add("bg-gray-100", "text-gray-600");
    if (btn.dataset.periodo === periodo) {
      btn.classList.remove("bg-gray-100", "text-gray-600");
      btn.classList.add("bg-orange-500", "text-white");
    }
  });

  await atualizarRelatorio();
};

// Toggle do seletor de mês
window.toggleSeletorMes = function () {
  const seletor = document.getElementById("seletor-mes");
  const btn = document.getElementById("btn-selecionar-mes");

  seletor.classList.toggle("hidden");

  // Inicializa os selects com mês e ano atual
  if (!seletor.classList.contains("hidden")) {
    const hoje = new Date();
    const mesSelect = document.getElementById("relatorio-mes");
    const anoSelect = document.getElementById("relatorio-ano");

    // Define mês atual
    mesSelect.value = hoje.getMonth() + 1;

    // Popula anos (últimos 3 anos)
    const anoAtual = hoje.getFullYear();
    anoSelect.innerHTML = "";
    for (let ano = anoAtual; ano >= anoAtual - 2; ano--) {
      const option = document.createElement("option");
      option.value = ano;
      option.textContent = ano;
      anoSelect.appendChild(option);
    }
  }
};

// Filtrar relatório por mês específico
window.filtrarRelatorioPorMes = async function () {
  const mes = document.getElementById("relatorio-mes").value;
  const ano = document.getElementById("relatorio-ano").value;

  periodoAtual = `mes-especifico`;

  // Atualiza visual dos botões
  document.querySelectorAll(".periodo-btn").forEach((btn) => {
    btn.classList.remove("bg-orange-500", "text-white");
    btn.classList.add("bg-gray-100", "text-gray-600");
  });
  document
    .getElementById("btn-selecionar-mes")
    .classList.remove("bg-gray-100", "text-gray-600");
  document
    .getElementById("btn-selecionar-mes")
    .classList.add("bg-orange-500", "text-white");

  // Busca relatório com mês e ano específicos
  try {
    const response = await fetch(
      `${API_BASE}/api/relatorios?periodo=mes-especifico&mes=${mes}&ano=${ano}`,
    );
    const data = await response.json();

    // Atualiza resumo financeiro
    document.getElementById("rel-total-vendas").textContent =
      `R$ ${data.totalVendas.toFixed(2).replace(".", ",")}`;
    document.getElementById("rel-total-entregas").textContent =
      data.totalEntregas;

    // Atualiza mais vendidos
    const maisVendidosEl = document.getElementById("rel-mais-vendidos");
    if (data.maisVendidos.length === 0) {
      maisVendidosEl.innerHTML =
        '<p class="text-gray-500 text-sm">Nenhuma venda no período</p>';
    } else {
      maisVendidosEl.innerHTML = data.maisVendidos
        .map(
          (item, index) => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 flex items-center justify-center bg-orange-100 text-orange-600 rounded-full font-bold">${index + 1}</span>
            <span class="font-medium">${item.nome}</span>
          </div>
          <span class="text-gray-600">${item.quantidade} un</span>
        </div>
      `,
        )
        .join("");
    }

    // Atualiza entregas por dia
    const porDiaEl = document.getElementById("rel-por-dia");
    if (data.porDia.length === 0) {
      porDiaEl.innerHTML =
        '<p class="text-gray-500 text-sm">Nenhuma entrega no período</p>';
    } else {
      porDiaEl.innerHTML = data.porDia
        .map(
          (dia) => `
        <div class="flex items-center justify-between p-2 border-b border-gray-100">
          <span class="text-gray-600">${dia.data}</span>
          <span class="font-medium text-orange-600">${dia.quantidade} entregas</span>
        </div>
      `,
        )
        .join("");
    }

    // Atualiza estoque baixo
    const estoqueBaixoEl = document.getElementById("rel-estoque-baixo");
    if (data.estoqueBaixo.length === 0) {
      estoqueBaixoEl.innerHTML =
        '<p class="text-green-600 text-sm">Estoque OK!</p>';
    } else {
      estoqueBaixoEl.innerHTML = data.estoqueBaixo
        .map(
          (item) => `
        <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <span class="font-medium text-red-700">${item.nome}</span>
          <span class="text-red-600 font-bold">${item.quantidade} un</span>
        </div>
      `,
        )
        .join("");
    }
  } catch (error) {
    console.error("Erro ao carregar relatório:", error);
    showToast("Erro ao carregar relatório", "error");
  }
};

async function atualizarRelatorio() {
  try {
    const response = await fetch(
      `${API_BASE}/api/relatorios?periodo=${periodoAtual}`,
    );
    const data = await response.json();

    // Atualiza resumo financeiro
    document.getElementById("rel-total-vendas").textContent =
      `R$ ${data.totalVendas.toFixed(2).replace(".", ",")}`;
    document.getElementById("rel-total-entregas").textContent =
      data.totalEntregas;

    // Atualiza mais vendidos
    const maisVendidosEl = document.getElementById("rel-mais-vendidos");
    if (data.maisVendidos.length === 0) {
      maisVendidosEl.innerHTML =
        '<p class="text-gray-500 text-sm">Nenhuma venda no período</p>';
    } else {
      maisVendidosEl.innerHTML = data.maisVendidos
        .map(
          (item, index) => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 flex items-center justify-center bg-orange-100 text-orange-600 rounded-full font-bold">${index + 1}</span>
            <span class="font-medium text-gray-800 capitalize">${item.nome}</span>
          </div>
          <span class="text-lg font-bold text-orange-500">${item.quantidade}</span>
        </div>
      `,
        )
        .join("");
    }

    // Atualiza entregas por dia
    const porDiaEl = document.getElementById("rel-por-dia");
    const dias = Object.entries(data.porDia).sort((a, b) =>
      b[0].localeCompare(a[0]),
    );
    if (dias.length === 0) {
      porDiaEl.innerHTML =
        '<p class="text-gray-500 text-sm">Nenhuma entrega no período</p>';
    } else {
      porDiaEl.innerHTML = dias
        .map(([data, qtd]) => {
          const [ano, mes, dia] = data.split("-");
          return `
          <div class="flex items-center justify-between p-2 border-b border-gray-100">
            <span class="text-gray-600">${dia}/${mes}</span>
            <span class="font-medium text-gray-800">${qtd} entrega${qtd > 1 ? "s" : ""}</span>
          </div>
        `;
        })
        .join("");
    }
  } catch (error) {
    console.error("Erro ao carregar relatório:", error);
  }
}

async function carregarEstoqueBaixo() {
  try {
    const response = await fetch(
      `${API_BASE}/api/estoque-baixo?limite=${limiteEstoque}`,
    );
    const data = await response.json();

    const estoqueBaixoEl = document.getElementById("rel-estoque-baixo");
    if (data.length === 0) {
      estoqueBaixoEl.innerHTML =
        '<p class="text-green-600 text-sm font-medium">Todos os itens com estoque OK!</p>';
    } else {
      estoqueBaixoEl.innerHTML = data
        .map(
          (item) => `
        <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
          <span class="font-medium text-red-800">${item.nome}</span>
          <span class="text-lg font-bold text-red-600">${item.quantidade} un</span>
        </div>
      `,
        )
        .join("");
    }
  } catch (error) {
    console.error("Erro ao carregar estoque baixo:", error);
  }
}

window.salvarLimiteEstoque = function (valor) {
  limiteEstoque = parseInt(valor) || 10;
  localStorage.setItem("limiteEstoque", limiteEstoque);
  carregarEstoqueBaixo();
};

window.notificarEstoqueBaixo = async function () {
  try {
    showToast("Enviando notificação...", "info");
    const response = await fetch(`${API_BASE}/api/notificar-estoque-baixo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limite: limiteEstoque }),
    });

    const data = await response.json();

    if (response.ok) {
      showToast(data.message, "success");
    } else {
      showToast(data.error || "Erro ao notificar", "error");
    }
  } catch (error) {
    showToast("Erro de conexão", "error");
  }
};

function formatarDataCompleta(dataStr) {
  const [ano, mes, dia] = dataStr.split("-");
  const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
  const diasSemana = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];

  return `${diasSemana[data.getDay()]}, ${parseInt(dia)} de ${meses[parseInt(mes) - 1]}`;
}

// Filtro do histórico
window.filtrarHistorico = function (filtro) {
  filtroAtual = filtro;
  document.querySelectorAll(".filtro-btn").forEach((btn) => {
    btn.classList.remove("bg-orange-500", "text-white");
    btn.classList.add("bg-gray-100", "text-gray-600");
    if (btn.dataset.filtro === filtro) {
      btn.classList.remove("bg-gray-100", "text-gray-600");
      btn.classList.add("bg-orange-500", "text-white");
    }
  });
  renderHistorico();
};

// ==================== ESTOQUE ====================

async function carregarEstoque() {
  try {
    const response = await fetch(`${API_BASE}/api/estoque`);
    estoqueItems = await response.json();
    renderEstoqueResumo();
    renderEstoque();
    renderItensDisponiveis();
  } catch (error) {
    console.error("Erro ao carregar estoque:", error);
  }
}

function renderEstoqueResumo() {
  if (estoqueItems.length === 0) {
    elements.estoqueResumo.innerHTML =
      '<p class="col-span-3 text-sm opacity-70">Cadastre produtos no estoque</p>';
    return;
  }

  elements.estoqueResumo.innerHTML = estoqueItems
    .slice(0, 6)
    .map((item) => {
      const corQtd = item.quantidade <= 10 ? "text-red-200" : "text-white";
      return `
      <div class="bg-white bg-opacity-20 rounded-lg p-2">
        <p class="text-xs opacity-80 truncate">${item.nome}</p>
        <p class="text-lg font-bold ${corQtd}">${item.quantidade}</p>
      </div>
    `;
    })
    .join("");
}

function renderEstoque() {
  if (estoqueItems.length === 0) {
    elements.listaEstoque.innerHTML = "";
    elements.estoqueVazio.classList.remove("hidden");
    return;
  }

  elements.estoqueVazio.classList.add("hidden");

  elements.listaEstoque.innerHTML = estoqueItems
    .map((item) => {
      const corQtd =
        item.quantidade <= 10
          ? "text-red-500"
          : item.quantidade <= 50
            ? "text-yellow-600"
            : "text-green-600";
      return `
      <div class="bg-white rounded-xl p-4 shadow-md card-touch">
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="font-semibold text-gray-800 text-lg">${item.nome}</p>
            <p class="text-sm text-gray-500">R$ ${(item.preco_unitario || 0).toFixed(2)} /un</p>
          </div>
          <div class="text-right">
            <p class="text-3xl font-bold ${corQtd}">${item.quantidade}</p>
            <p class="text-xs text-gray-400">unidades</p>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button onclick="ajustarEstoque(${item.id}, 'adicionar')" class="bg-green-100 text-green-700 py-3 rounded-xl text-sm font-medium hover:bg-green-200 active:bg-green-300 btn-touch">+ Entrada</button>
          <button onclick="ajustarEstoque(${item.id}, 'remover')" class="bg-red-100 text-red-700 py-3 rounded-xl text-sm font-medium hover:bg-red-200 active:bg-red-300 btn-touch">- Saída</button>
          <button onclick="removerProduto(${item.id})" class="bg-gray-100 text-gray-500 py-3 rounded-xl hover:bg-gray-200 active:bg-gray-300 btn-touch flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

async function handleEstoqueSubmit(e) {
  e.preventDefault();

  const nome = elements.estoqueNome.value.trim();
  const quantidade = parseInt(elements.estoqueQuantidade.value) || 0;
  const preco = parseFloat(elements.estoquePreco.value) || 0;

  if (!nome) {
    showToast("Digite o nome do produto", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/estoque`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, quantidade, preco_unitario: preco }),
    });

    const result = await response.json();

    if (response.ok) {
      showToast("Produto adicionado!", "success");
      elements.formEstoque.reset();
      await carregarEstoque();
    } else {
      showToast(result.error || "Erro ao adicionar", "error");
    }
  } catch (error) {
    showToast("Erro de conexão", "error");
  }
}

window.ajustarEstoque = async function (id, tipo) {
  const quantidade = prompt(
    `Quantidade para ${tipo === "adicionar" ? "entrada" : "saída"}:`,
  );
  if (!quantidade || parseInt(quantidade) <= 0) return;

  try {
    const response = await fetch(`${API_BASE}/api/estoque/${id}/${tipo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantidade: parseInt(quantidade) }),
    });

    const result = await response.json();

    if (response.ok) {
      showToast(result.message, "success");
      await carregarEstoque();
    } else {
      showToast(result.error, "error");
    }
  } catch (error) {
    showToast("Erro de conexão", "error");
  }
};

window.removerProduto = async function (id) {
  if (!confirm("Remover este produto do estoque?")) return;

  try {
    const response = await fetch(`${API_BASE}/api/estoque/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      showToast("Produto removido", "info");
      await carregarEstoque();
    }
  } catch (error) {
    showToast("Erro de conexão", "error");
  }
};

// ==================== ITENS DO PEDIDO (CHIPS) ====================

function renderItensDisponiveis() {
  // Filtra itens que ainda não foram selecionados
  const disponiveis = estoqueItems.filter(
    (item) =>
      !itensSelecionados.find((s) => s.id === item.id) && item.quantidade > 0,
  );

  if (estoqueItems.length === 0) {
    elements.itensDisponiveis.innerHTML =
      '<p class="text-sm text-gray-500 py-2">Cadastre produtos no estoque primeiro</p>';
    return;
  }

  if (disponiveis.length === 0 && itensSelecionados.length === 0) {
    elements.itensDisponiveis.innerHTML =
      '<p class="text-sm text-gray-500 py-2">Todos os produtos estão sem estoque</p>';
    return;
  }

  elements.itensDisponiveis.innerHTML = disponiveis
    .map(
      (item) => `
      <button
        type="button"
        onclick="selecionarItem(${item.id})"
        class="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-orange-100 active:bg-orange-200 rounded-full text-sm font-medium text-gray-700 transition-colors btn-touch"
      >
        <span>${item.nome}</span>
        <span class="text-xs text-gray-500">(${item.quantidade})</span>
      </button>
    `,
    )
    .join("");

  renderItensSelecionados();
}

function renderItensSelecionados() {
  if (itensSelecionados.length === 0) {
    elements.itensSelecionados.innerHTML = "";
    return;
  }

  elements.itensSelecionados.innerHTML = itensSelecionados
    .map(
      (item, index) => `
      <div class="flex items-center gap-3 bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
        <div class="flex-1">
          <p class="font-medium text-gray-800">${item.nome}</p>
          <p class="text-xs text-gray-500">Máx: ${item.maxQtd}</p>
        </div>
        <input
          type="number"
          inputmode="numeric"
          min="1"
          max="${item.maxQtd}"
          value="${item.quantidade || ""}"
          placeholder="1"
          onchange="atualizarQtd(${index}, this.value)"
          onfocus="this.select()"
          class="w-20 px-3 py-2 text-center text-lg font-bold border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        <button type="button" onclick="removerItemSelecionado(${index})" class="w-10 h-10 text-red-500 hover:bg-red-50 active:bg-red-100 rounded-full flex items-center justify-center btn-touch">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `,
    )
    .join("");
}

window.selecionarItem = function (id) {
  const item = estoqueItems.find((e) => e.id === id);
  if (!item) return;

  itensSelecionados.push({
    id: item.id,
    nome: item.nome,
    quantidade: 0,
    maxQtd: item.quantidade,
  });

  renderItensDisponiveis();
};

window.removerItemSelecionado = function (index) {
  itensSelecionados.splice(index, 1);
  renderItensDisponiveis();
};

window.atualizarQtd = function (index, valor) {
  const item = itensSelecionados[index];
  let qtd = parseInt(valor) || 0;

  if (qtd > item.maxQtd) {
    qtd = item.maxQtd;
    showToast(`Máximo disponível: ${item.maxQtd}`, "warning");
  }

  item.quantidade = qtd;
  renderItensSelecionados();
};

// ==================== EMBALAGEM ====================

window.selecionarEmbalagem = function (tipo) {
  embalagemTipo = tipo;
  embalagemQtd = 1;

  // Atualiza visual dos botões
  document.querySelectorAll(".emb-btn").forEach((btn) => {
    btn.classList.remove("bg-orange-500", "text-white");
    btn.classList.add("bg-gray-100", "text-gray-600");
  });
  document
    .getElementById(`emb-${tipo}`)
    .classList.remove("bg-gray-100", "text-gray-600");
  document
    .getElementById(`emb-${tipo}`)
    .classList.add("bg-orange-500", "text-white");

  // Mostra/esconde detalhes
  const detalhes = document.getElementById("embalagem-detalhes");
  const descInput = document.getElementById("embalagem-descricao");

  if (tipo === "nenhuma") {
    detalhes.classList.add("hidden");
    descInput.value = "";
  } else {
    detalhes.classList.remove("hidden");
    descInput.placeholder =
      tipo === "tapper"
        ? "Qual tapper? (ex: Azul grande)"
        : "Qual isopor? (ex: Isopor 5L)";
  }

  document.getElementById("embalagem-qtd").textContent = embalagemQtd;
};

window.ajustarQtdEmbalagem = function (delta) {
  const novaQtd = embalagemQtd + delta;
  if (novaQtd >= 1 && novaQtd <= 99) {
    embalagemQtd = novaQtd;
    document.getElementById("embalagem-qtd").textContent = embalagemQtd;
  }
};

function getEmbalagemTexto() {
  if (embalagemTipo === "nenhuma") return "";

  const descricao = document.getElementById("embalagem-descricao").value.trim();
  const tipoLabel = embalagemTipo === "tapper" ? "Tapper" : "Isopor";

  if (descricao) {
    return `[${embalagemQtd}x ${tipoLabel}: ${descricao}]`;
  }
  return `[${embalagemQtd}x ${tipoLabel}]`;
}

function resetEmbalagem() {
  embalagemTipo = "nenhuma";
  embalagemQtd = 1;
  document.querySelectorAll(".emb-btn").forEach((btn) => {
    btn.classList.remove("bg-orange-500", "text-white");
    btn.classList.add("bg-gray-100", "text-gray-600");
  });
  document
    .getElementById("emb-nenhuma")
    .classList.remove("bg-gray-100", "text-gray-600");
  document
    .getElementById("emb-nenhuma")
    .classList.add("bg-orange-500", "text-white");
  document.getElementById("embalagem-detalhes").classList.add("hidden");
  document.getElementById("embalagem-descricao").value = "";
  document.getElementById("embalagem-qtd").textContent = "1";
}

// ==================== AUTH & CONFIG ====================

async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_BASE}/auth/status`);
    const data = await response.json();
    isConfigured = data.authenticated;
    updateAuthUI();
  } catch (error) {
    isConfigured = false;
    updateAuthUI();
  }
}

function updateAuthUI() {
  if (isConfigured) {
    elements.authStatus.textContent = "✓ Voice Monkey configurado";
    elements.authStatus.classList.add("text-green-200");
  } else {
    elements.authStatus.textContent = "Configure o Voice Monkey no menu";
    elements.authStatus.classList.remove("text-green-200");
  }
}

async function salvarConfig() {
  const token = elements.inputToken.value.trim();
  const device = elements.inputDevice.value.trim();

  if (!token || !device) {
    showToast("Preencha o Token e o Device ID", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/configure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode: `${token}:${device}` }),
    });

    if (response.ok) {
      showToast("Configuração salva!", "success");
      isConfigured = true;
      updateAuthUI();
    } else {
      showToast("Erro ao salvar", "error");
    }
  } catch (error) {
    showToast("Erro de conexão", "error");
  }
}

async function testarNotificacao() {
  if (!isConfigured) {
    showToast("Salve a configuração primeiro", "error");
    return;
  }

  try {
    showToast("Enviando teste...", "info");
    const response = await fetch(
      `${API_BASE}/api/entregas/testar-notificacao`,
      { method: "POST" },
    );
    if (response.ok) {
      showToast("Teste enviado! Verifique sua Alexa.", "success");
    } else {
      showToast("Erro no teste", "error");
    }
  } catch (error) {
    showToast("Erro de conexão", "error");
  }
}

// ==================== ENTREGAS ====================

async function carregarEntregas() {
  try {
    const response = await fetch(`${API_BASE}/api/entregas`);
    entregas = await response.json();
    renderEntregas();
    if (paginaAtual === "historico") renderHistorico();
  } catch (error) {
    showToast("Erro ao carregar entregas", "error");
  }
}

function renderEntregas() {
  const agendadas = entregas.filter((e) => e.status === "agendada");

  if (agendadas.length === 0) {
    elements.listaEntregas.innerHTML = "";
    elements.listaVazia.classList.remove("hidden");
    return;
  }

  elements.listaVazia.classList.add("hidden");

  elements.listaEntregas.innerHTML = agendadas
    .map((entrega) => {
      const dataFormatada = formatarData(entrega.data);
      return `
      <div class="bg-white rounded-xl p-4 shadow-md card-touch">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="font-semibold text-gray-800 text-lg">${escapeHtml(entrega.descricao)}</p>
            <p class="text-sm text-gray-500 mt-2">📅 ${dataFormatada} às ${entrega.horario}</p>
            <p class="text-xs text-gray-400 mt-1">⏰ Aviso ${entrega.antecedencia_minutos} min antes</p>
          </div>
          <div class="flex gap-1 ml-2">
            <button onclick="concluirEntrega(${entrega.id})" class="p-3 text-green-500 hover:bg-green-50 active:bg-green-100 rounded-xl btn-touch" title="Concluir">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </button>
            <button onclick="removerEntrega(${entrega.id})" class="p-3 text-red-500 hover:bg-red-50 active:bg-red-100 rounded-xl btn-touch" title="Remover">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderHistorico() {
  let lista = [...entregas];

  if (filtroAtual === "atencao") {
    lista = lista.filter((e) => e.status === "atencao");
  } else if (filtroAtual !== "todos") {
    lista = lista.filter((e) => e.status === filtroAtual);
  }

  lista.sort(
    (a, b) =>
      new Date(`${b.data}T${b.horario}`) - new Date(`${a.data}T${a.horario}`),
  );

  if (lista.length === 0) {
    elements.listaHistorico.innerHTML = "";
    elements.historicoVazio.classList.remove("hidden");
    return;
  }

  elements.historicoVazio.classList.add("hidden");

  elements.listaHistorico.innerHTML = lista
    .map((entrega) => {
      const dataFormatada = formatarData(entrega.data);
      const isConcluida = entrega.status === "concluida";
      const isAtencao = entrega.status === "atencao";

      let statusClass, statusText, cardClass;
      if (isAtencao) {
        statusClass = "bg-red-100 text-red-700";
        statusText = "⚠️ Atenção";
        cardClass = "border-2 border-red-400 bg-red-50";
      } else if (isConcluida) {
        statusClass = "bg-green-100 text-green-700";
        statusText = "✓ Entregue";
        cardClass = "opacity-75";
      } else {
        statusClass = "bg-yellow-100 text-yellow-700";
        statusText = "⏳ Agendada";
        cardClass = "";
      }

      return `
      <div class="bg-white rounded-xl p-4 shadow-md card-touch ${cardClass}">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm px-3 py-1 rounded-full ${statusClass} font-medium">${statusText}</span>
              ${isAtencao ? '<span class="text-xs text-red-600 font-bold animate-pulse-attention">Passou 2h!</span>' : ""}
            </div>
            <p class="font-semibold text-gray-800 text-lg ${isConcluida ? "line-through" : ""}">${escapeHtml(entrega.descricao)}</p>
            <p class="text-sm text-gray-500 mt-2">📅 ${dataFormatada} às ${entrega.horario}</p>
          </div>
          ${
            !isConcluida
              ? `
            <button onclick="concluirEntrega(${entrega.id})" class="p-3 ${isAtencao ? "text-red-500 bg-red-50" : "text-green-500"} hover:bg-green-50 active:bg-green-100 rounded-xl btn-touch">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </button>
          `
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");
}

async function handleSubmit(e) {
  e.preventDefault();

  const data = elements.data.value;
  const horario = elements.horario.value;
  const descricao = elements.descricao.value.trim();
  const antecedencia = parseInt(elements.antecedencia.value);

  if (!data || !horario || !descricao) {
    showToast("Preencha todos os campos", "error");
    return;
  }

  const dataHora = new Date(`${data}T${horario}`);
  if (dataHora <= new Date()) {
    showToast("A data/hora deve ser no futuro", "error");
    return;
  }

  // Verifica estoque disponível
  for (const item of itensSelecionados) {
    const estoqueItem = estoqueItems.find((e) => e.id === item.id);
    if (estoqueItem && item.quantidade > estoqueItem.quantidade) {
      showToast(
        `Estoque insuficiente de ${item.nome}. Disponível: ${estoqueItem.quantidade}`,
        "error",
      );
      return;
    }
  }

  // Normaliza quantidade (0 ou vazio vira 1)
  itensSelecionados.forEach((item) => {
    if (!item.quantidade || item.quantidade < 1) {
      item.quantidade = 1;
    }
  });

  // Monta descrição com itens e embalagem
  let descricaoCompleta = descricao;
  if (itensSelecionados.length > 0) {
    const itensTexto = itensSelecionados
      .map((i) => `${i.quantidade}x ${i.nome}`)
      .join(", ");
    descricaoCompleta = `${itensTexto} - ${descricao}`;
  }

  // Adiciona embalagem se selecionada
  const embalagemTexto = getEmbalagemTexto();
  if (embalagemTexto) {
    descricaoCompleta = `${descricaoCompleta} ${embalagemTexto}`;
  }

  setLoading(true);

  try {
    // Prepara itens estruturados para salvar no banco
    const itensParaSalvar = itensSelecionados.map((item) => ({
      estoque_id: item.id,
      quantidade: item.quantidade,
    }));

    const response = await fetch(`${API_BASE}/api/entregas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
        horario,
        descricao: descricaoCompleta,
        antecedencia_minutos: antecedencia,
        itens: itensParaSalvar,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      // Baixa do estoque
      for (const item of itensSelecionados) {
        await fetch(`${API_BASE}/api/estoque/${item.id}/remover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantidade: item.quantidade }),
        });
      }

      // Limpa formulário
      elements.form.reset();
      elements.data.value = new Date().toISOString().split("T")[0];
      elements.horario.value = "";
      itensSelecionados = [];
      resetEmbalagem();

      if (result.alexa?.configured) {
        showToast("Entrega agendada! Alexa vai te avisar.", "success");
      } else {
        showToast("Entrega salva!", "success");
      }

      await carregarEstoque();
      await carregarEntregas();
    } else {
      showToast(result.error || "Erro ao salvar", "error");
    }
  } catch (error) {
    showToast("Erro de conexão", "error");
  } finally {
    setLoading(false);
  }
}

window.removerEntrega = async function (id) {
  if (!confirm("Remover esta entrega?")) return;
  try {
    const response = await fetch(`${API_BASE}/api/entregas/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      showToast("Entrega removida", "info");
      await carregarEntregas();
    }
  } catch (error) {
    showToast("Erro de conexão", "error");
  }
};

window.concluirEntrega = async function (id) {
  try {
    const response = await fetch(`${API_BASE}/api/entregas/${id}/concluir`, {
      method: "POST",
    });
    if (response.ok) {
      showToast("Entrega concluída!", "success");
      await carregarEntregas();
    }
  } catch (error) {
    showToast("Erro de conexão", "error");
  }
};

// ==================== UTILS ====================

function setLoading(loading) {
  elements.btnSalvar.disabled = loading;
  elements.loading.classList.toggle("hidden", !loading);
}

function showToast(message, type = "info") {
  const colors = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    warning: "bg-yellow-500 text-black",
    info: "bg-blue-500 text-white",
  };
  elements.toast.className = `fixed top-24 left-4 right-4 p-4 rounded-xl shadow-lg z-50 text-center font-medium ${colors[type]}`;
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  setTimeout(() => elements.toast.classList.add("hidden"), 3500);
}

function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.log("SW error:", err));
  }
}

// app.js - Lógica principal do PWA Salgados Delivery

const API_BASE = window.location.origin;

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
  elements.data.min = new Date().toISOString().split("T")[0];
  elements.data.value = elements.data.min;

  // Popula o seletor de horário com formato 24h
  popularHorarios();

  await checkAuthStatus();
  await carregarEstoque();
  await carregarEntregas();
  registerServiceWorker();
});

// Popula select de horários em formato 24h (06:00 até 23:30)
function popularHorarios() {
  const select = elements.horario;
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hora = h.toString().padStart(2, "0");
      const minuto = m.toString().padStart(2, "0");
      const option = document.createElement("option");
      option.value = `${hora}:${minuto}`;
      option.textContent = `${hora}:${minuto}`;
      select.appendChild(option);
    }
  }
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
    home: "🍗 Simone Salgados",
    estoque: "📦 Estoque",
    historico: "📋 Histórico",
    config: "⚙️ Configurações",
  };
  elements.pageTitle.textContent = titulos[page] || "🍗 Simone Salgados";

  toggleSidebar();

  if (page === "historico") renderHistorico();
  if (page === "estoque") renderEstoque();
  if (page === "home") renderItensDisponiveis();
};

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
          <p class="text-xs text-gray-500">Disponível: ${item.maxQtd}</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="diminuirQtd(${index})" class="w-10 h-10 bg-orange-200 text-orange-700 rounded-full text-xl font-bold hover:bg-orange-300 active:bg-orange-400 btn-touch">−</button>
          <span class="w-12 text-center text-xl font-bold text-gray-800">${item.quantidade}</span>
          <button type="button" onclick="aumentarQtd(${index})" class="w-10 h-10 bg-orange-200 text-orange-700 rounded-full text-xl font-bold hover:bg-orange-300 active:bg-orange-400 btn-touch">+</button>
        </div>
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
    quantidade: 1,
    maxQtd: item.quantidade,
  });

  renderItensDisponiveis();
};

window.removerItemSelecionado = function (index) {
  itensSelecionados.splice(index, 1);
  renderItensDisponiveis();
};

window.aumentarQtd = function (index) {
  const item = itensSelecionados[index];
  if (item.quantidade < item.maxQtd) {
    item.quantidade++;
    renderItensSelecionados();
  } else {
    showToast(`Máximo disponível: ${item.maxQtd}`, "warning");
  }
};

window.diminuirQtd = function (index) {
  const item = itensSelecionados[index];
  if (item.quantidade > 1) {
    item.quantidade--;
    renderItensSelecionados();
  }
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
    const response = await fetch(`${API_BASE}/api/entregas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
        horario,
        descricao: descricaoCompleta,
        antecedencia_minutos: antecedencia,
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

// routes/estoque.js - CRUD de estoque de salgados
const express = require("express");
const { estoque, estoqueLog } = require("../database");

const router = express.Router();

// GET /api/estoque - Lista todos os itens
router.get("/", async (req, res) => {
  try {
    const lista = await estoque.listar();
    res.json(lista);
  } catch (error) {
    console.error("Erro ao listar estoque:", error);
    res.status(500).json({ error: "Erro ao listar estoque" });
  }
});

// GET /api/estoque/log - Lista histórico de movimentações
router.get("/log", async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 50;
    const lista = await estoqueLog.listar(limite);
    res.json(lista);
  } catch (error) {
    console.error("Erro ao listar log de estoque:", error);
    res.status(500).json({ error: "Erro ao listar histórico" });
  }
});

// GET /api/estoque/:id - Busca item por ID
router.get("/:id", async (req, res) => {
  try {
    const item = await estoque.buscarPorId(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }
    res.json(item);
  } catch (error) {
    console.error("Erro ao buscar item:", error);
    res.status(500).json({ error: "Erro ao buscar item" });
  }
});

// POST /api/estoque - Adiciona novo item
router.post("/", async (req, res) => {
  try {
    const { nome, quantidade, preco_unitario } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    // Verifica se já existe
    const existente = await estoque.buscarPorNome(nome.trim());
    if (existente) {
      return res.status(400).json({ error: "Já existe um item com esse nome" });
    }

    const novoItem = await estoque.adicionar({
      nome: nome.trim(),
      quantidade: parseInt(quantidade) || 0,
      preco_unitario: parseFloat(preco_unitario) || 0,
    });

    // Registra no log
    if (novoItem.quantidade > 0) {
      await estoqueLog.registrar({
        estoque_id: novoItem.id,
        nome_produto: novoItem.nome,
        tipo: "criacao",
        quantidade: novoItem.quantidade,
        quantidade_anterior: 0,
        quantidade_depois: novoItem.quantidade,
      });
    }

    res.status(201).json({ success: true, item: novoItem });
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    res.status(500).json({ error: "Erro ao adicionar item" });
  }
});

// PUT /api/estoque/:id - Atualiza item
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, quantidade, preco_unitario } = req.body;

    const item = await estoque.buscarPorId(id);
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    await estoque.atualizar(id, {
      nome: nome?.trim() || item.nome,
      quantidade:
        quantidade !== undefined ? parseInt(quantidade) : item.quantidade,
      preco_unitario:
        preco_unitario !== undefined
          ? parseFloat(preco_unitario)
          : item.preco_unitario,
    });

    const itemAtualizado = await estoque.buscarPorId(id);
    res.json({ success: true, item: itemAtualizado });
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    res.status(500).json({ error: "Erro ao atualizar item" });
  }
});

// POST /api/estoque/:id/adicionar - Adiciona quantidade
router.post("/:id/adicionar", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantidade } = req.body;

    if (!quantidade || quantidade <= 0) {
      return res
        .status(400)
        .json({ error: "Quantidade deve ser maior que zero" });
    }

    const item = await estoque.buscarPorId(id);
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    const qtdAnterior = item.quantidade;
    await estoque.adicionarQuantidade(id, parseInt(quantidade));
    const itemAtualizado = await estoque.buscarPorId(id);

    // Registra no log
    await estoqueLog.registrar({
      estoque_id: parseInt(id),
      nome_produto: item.nome,
      tipo: "entrada",
      quantidade: parseInt(quantidade),
      quantidade_anterior: qtdAnterior,
      quantidade_depois: itemAtualizado.quantidade,
    });

    res.json({
      success: true,
      message: `+${quantidade} adicionados`,
      item: itemAtualizado,
    });
  } catch (error) {
    console.error("Erro ao adicionar quantidade:", error);
    res.status(500).json({ error: "Erro ao adicionar quantidade" });
  }
});

// POST /api/estoque/:id/remover - Remove quantidade
router.post("/:id/remover", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantidade } = req.body;

    if (!quantidade || quantidade <= 0) {
      return res
        .status(400)
        .json({ error: "Quantidade deve ser maior que zero" });
    }

    const item = await estoque.buscarPorId(id);
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    if (item.quantidade < quantidade) {
      return res.status(400).json({
        error: `Estoque insuficiente. Disponível: ${item.quantidade}`,
      });
    }

    const qtdAnterior = item.quantidade;
    await estoque.removerQuantidade(id, parseInt(quantidade));
    const itemAtualizado = await estoque.buscarPorId(id);

    // Registra no log
    await estoqueLog.registrar({
      estoque_id: parseInt(id),
      nome_produto: item.nome,
      tipo: "saida",
      quantidade: parseInt(quantidade),
      quantidade_anterior: qtdAnterior,
      quantidade_depois: itemAtualizado.quantidade,
    });

    res.json({
      success: true,
      message: `-${quantidade} removidos`,
      item: itemAtualizado,
    });
  } catch (error) {
    console.error("Erro ao remover quantidade:", error);
    res.status(500).json({ error: "Erro ao remover quantidade" });
  }
});

// DELETE /api/estoque/:id - Remove item
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const item = await estoque.buscarPorId(id);
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    // Registra no log antes de remover
    if (item.quantidade > 0) {
      await estoqueLog.registrar({
        estoque_id: parseInt(id),
        nome_produto: item.nome,
        tipo: "remocao",
        quantidade: item.quantidade,
        quantidade_anterior: item.quantidade,
        quantidade_depois: 0,
      });
    }

    await estoque.remover(id);
    res.json({ success: true, message: "Item removido" });
  } catch (error) {
    console.error("Erro ao remover item:", error);
    res.status(500).json({ error: "Erro ao remover item" });
  }
});

module.exports = router;

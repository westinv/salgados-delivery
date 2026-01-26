// routes/estoque.js - CRUD de estoque de salgados
const express = require('express');
const { estoque } = require('../database');

const router = express.Router();

// GET /api/estoque - Lista todos os itens
router.get('/', (req, res) => {
  try {
    const lista = estoque.listar();
    res.json(lista);
  } catch (error) {
    console.error('Erro ao listar estoque:', error);
    res.status(500).json({ error: 'Erro ao listar estoque' });
  }
});

// GET /api/estoque/:id - Busca item por ID
router.get('/:id', (req, res) => {
  try {
    const item = estoque.buscarPorId(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    res.json(item);
  } catch (error) {
    console.error('Erro ao buscar item:', error);
    res.status(500).json({ error: 'Erro ao buscar item' });
  }
});

// POST /api/estoque - Adiciona novo item
router.post('/', (req, res) => {
  try {
    const { nome, quantidade, preco_unitario } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verifica se já existe
    const existente = estoque.buscarPorNome(nome.trim());
    if (existente) {
      return res.status(400).json({ error: 'Já existe um item com esse nome' });
    }

    const novoItem = estoque.adicionar({
      nome: nome.trim(),
      quantidade: parseInt(quantidade) || 0,
      preco_unitario: parseFloat(preco_unitario) || 0
    });

    res.status(201).json({ success: true, item: novoItem });
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    res.status(500).json({ error: 'Erro ao adicionar item' });
  }
});

// PUT /api/estoque/:id - Atualiza item
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { nome, quantidade, preco_unitario } = req.body;

    const item = estoque.buscarPorId(id);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    estoque.atualizar(id, {
      nome: nome?.trim() || item.nome,
      quantidade: quantidade !== undefined ? parseInt(quantidade) : item.quantidade,
      preco_unitario: preco_unitario !== undefined ? parseFloat(preco_unitario) : item.preco_unitario
    });

    res.json({ success: true, item: estoque.buscarPorId(id) });
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// POST /api/estoque/:id/adicionar - Adiciona quantidade
router.post('/:id/adicionar', (req, res) => {
  try {
    const { id } = req.params;
    const { quantidade } = req.body;

    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
    }

    const item = estoque.buscarPorId(id);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    estoque.adicionarQuantidade(id, parseInt(quantidade));

    res.json({
      success: true,
      message: `+${quantidade} adicionados`,
      item: estoque.buscarPorId(id)
    });
  } catch (error) {
    console.error('Erro ao adicionar quantidade:', error);
    res.status(500).json({ error: 'Erro ao adicionar quantidade' });
  }
});

// POST /api/estoque/:id/remover - Remove quantidade
router.post('/:id/remover', (req, res) => {
  try {
    const { id } = req.params;
    const { quantidade } = req.body;

    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
    }

    const item = estoque.buscarPorId(id);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    if (item.quantidade < quantidade) {
      return res.status(400).json({
        error: `Estoque insuficiente. Disponível: ${item.quantidade}`
      });
    }

    estoque.removerQuantidade(id, parseInt(quantidade));

    res.json({
      success: true,
      message: `-${quantidade} removidos`,
      item: estoque.buscarPorId(id)
    });
  } catch (error) {
    console.error('Erro ao remover quantidade:', error);
    res.status(500).json({ error: 'Erro ao remover quantidade' });
  }
});

// DELETE /api/estoque/:id - Remove item
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const item = estoque.buscarPorId(id);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    estoque.remover(id);
    res.json({ success: true, message: 'Item removido' });
  } catch (error) {
    console.error('Erro ao remover item:', error);
    res.status(500).json({ error: 'Erro ao remover item' });
  }
});

module.exports = router;

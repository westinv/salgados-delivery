process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const { initDatabase, db, estoque, entregas, itensPedido } = require('../database');
const { router: entregasRoutes } = require('../routes/entregas');

const app = express();
app.use(express.json());
app.use('/api/entregas', entregasRoutes);

describe('Entregas API - Lógica de Estoque', () => {
  let coxinhaId;
  let pastelId;

  beforeAll(async () => {
    // Inicializa o banco de dados de teste
    await initDatabase();
  });

  beforeEach(async () => {
    // Limpa as tabelas antes de cada teste
    await db.execute('DELETE FROM itens_pedido');
    await db.execute('DELETE FROM entregas');
    await db.execute('DELETE FROM estoque');

    // Insere itens de estoque iniciais para os testes
    const resultCoxinha = await estoque.adicionar({ nome: 'Coxinha', quantidade: 50, preco_unitario: 5 });
    coxinhaId = resultCoxinha.id;
    
    const resultPastel = await estoque.adicionar({ nome: 'Pastel', quantidade: 20, preco_unitario: 6 });
    pastelId = resultPastel.id;
  });

  afterAll(async () => {
    // Opcional: remover o test.db se necessário, mas o SQLite em disco sobrescreve nos deletes.
  });

  test('Deve criar uma entrega e debitar o estoque', async () => {
    const novaEntrega = {
      data: '2050-01-01',
      horario: '14:00',
      descricao: 'Festa João',
      antecedencia_minutos: 30,
      itens: [
        { estoque_id: coxinhaId, quantidade: 10 },
        { estoque_id: pastelId, quantidade: 5 }
      ]
    };

    const res = await request(app)
      .post('/api/entregas')
      .send(novaEntrega);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    // Valida estoque
    const coxinha = await estoque.buscarPorId(coxinhaId);
    const pastel = await estoque.buscarPorId(pastelId);

    expect(coxinha.quantidade).toBe(40); // 50 - 10
    expect(pastel.quantidade).toBe(15);  // 20 - 5
  });

  test('Deve bloquear criação de entrega se estoque for insuficiente', async () => {
    const novaEntrega = {
      data: '2050-01-01',
      horario: '15:00',
      descricao: 'Festa Maria',
      antecedencia_minutos: 30,
      itens: [
        { estoque_id: coxinhaId, quantidade: 100 } // Temos apenas 50
      ]
    };

    const res = await request(app)
      .post('/api/entregas')
      .send(novaEntrega);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Estoque insuficiente');

    // Valida se o estoque não foi alterado
    const coxinha = await estoque.buscarPorId(coxinhaId);
    expect(coxinha.quantidade).toBe(50);
  });

  test('Deve editar uma entrega, repor o saldo antigo e debitar o novo', async () => {
    // 1. Cria a entrega inicial
    const novaEntrega = {
      data: '2050-01-01',
      horario: '16:00',
      descricao: 'Festa Ana',
      antecedencia_minutos: 30,
      itens: [
        { estoque_id: coxinhaId, quantidade: 10 }
      ]
    };

    const resPost = await request(app).post('/api/entregas').send(novaEntrega);
    const entregaId = resPost.body.entrega.id;

    // Confirma que debitou
    let coxinha = await estoque.buscarPorId(coxinhaId);
    expect(coxinha.quantidade).toBe(40);

    // 2. Edita a entrega, mudando de 10 para 15 coxinhas e adicionando 5 pastéis
    const entregaEditada = {
      data: '2050-01-01',
      horario: '16:00',
      descricao: 'Festa Ana (Atualizada)',
      itens: [
        { estoque_id: coxinhaId, quantidade: 15 },
        { estoque_id: pastelId, quantidade: 5 }
      ]
    };

    const resPut = await request(app).put(`/api/entregas/${entregaId}`).send(entregaEditada);
    
    expect(resPut.statusCode).toBe(200);
    
    // Valida o novo estoque
    coxinha = await estoque.buscarPorId(coxinhaId);
    let pastel = await estoque.buscarPorId(pastelId);

    expect(coxinha.quantidade).toBe(35); // 50 (inicial) - 15 = 35
    expect(pastel.quantidade).toBe(15);  // 20 (inicial) - 5 = 15
  });

  test('Deve bloquear edição de entrega se estoque for insuficiente', async () => {
    // 1. Cria a entrega inicial
    const novaEntrega = {
      data: '2050-01-01',
      horario: '17:00',
      descricao: 'Festa Pedro',
      antecedencia_minutos: 30,
      itens: [
        { estoque_id: coxinhaId, quantidade: 10 }
      ]
    };

    const resPost = await request(app).post('/api/entregas').send(novaEntrega);
    const entregaId = resPost.body.entrega.id;

    // 2. Tenta editar pedindo uma quantidade impossível (100 coxinhas)
    const entregaEditada = {
      data: '2050-01-01',
      horario: '17:00',
      descricao: 'Festa Pedro',
      itens: [
        { estoque_id: coxinhaId, quantidade: 100 }
      ]
    };

    const resPut = await request(app).put(`/api/entregas/${entregaId}`).send(entregaEditada);
    
    expect(resPut.statusCode).toBe(400);
    expect(resPut.body.error).toContain('Estoque insuficiente');

    // Valida se o estoque permaneceu igual ao momento após a criação (40 coxinhas)
    const coxinha = await estoque.buscarPorId(coxinhaId);
    expect(coxinha.quantidade).toBe(40);
  });

  test('Deve repor o estoque ao excluir uma entrega', async () => {
    // 1. Cria a entrega
    const novaEntrega = {
      data: '2050-01-01',
      horario: '18:00',
      descricao: 'Festa Lucas',
      antecedencia_minutos: 30,
      itens: [
        { estoque_id: coxinhaId, quantidade: 20 }
      ]
    };

    const resPost = await request(app).post('/api/entregas').send(novaEntrega);
    const entregaId = resPost.body.entrega.id;

    let coxinha = await estoque.buscarPorId(coxinhaId);
    expect(coxinha.quantidade).toBe(30);

    // 2. Exclui a entrega
    const resDelete = await request(app).delete(`/api/entregas/${entregaId}`);
    expect(resDelete.statusCode).toBe(200);

    // Valida se o estoque voltou a ser 50
    coxinha = await estoque.buscarPorId(coxinhaId);
    expect(coxinha.quantidade).toBe(50);
  });

});

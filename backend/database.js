// database.js - Configuração do banco SQLite com Turso
const { createClient } = require("@libsql/client");

// Configuração do cliente Turso
// Em produção usa Turso, em desenvolvimento usa SQLite local
let db;

if (process.env.TURSO_DATABASE_URL) {
  // Produção - Turso na nuvem
  db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  console.log("Conectado ao Turso (nuvem)");
} else {
  // Desenvolvimento - SQLite local
  db = createClient({
    url: "file:entregas.db",
  });
  console.log("Usando SQLite local");
}

// Inicializa as tabelas
async function initDatabase() {
  // Cria tabela de entregas
  await db.execute(`
    CREATE TABLE IF NOT EXISTS entregas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        horario TEXT NOT NULL,
        descricao TEXT NOT NULL,
        antecedencia_minutos INTEGER DEFAULT 30,
        alexa_reminder_id TEXT,
        status TEXT DEFAULT 'agendada',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria tabela de tokens
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        access_token TEXT,
        refresh_token TEXT,
        expires_at TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria tabela de estoque
  await db.execute(`
    CREATE TABLE IF NOT EXISTS estoque (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        quantidade INTEGER DEFAULT 0,
        preco_unitario REAL DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria tabela de itens do pedido
  await db.execute(`
    CREATE TABLE IF NOT EXISTS itens_pedido (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entrega_id INTEGER NOT NULL,
        estoque_id INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        FOREIGN KEY (entrega_id) REFERENCES entregas(id) ON DELETE CASCADE,
        FOREIGN KEY (estoque_id) REFERENCES estoque(id)
    )
  `);

  console.log("Tabelas inicializadas");
}

// Funções auxiliares para entregas
const entregas = {
  listar: async () => {
    const result = await db.execute(
      "SELECT * FROM entregas ORDER BY data ASC, horario ASC",
    );
    return result.rows;
  },

  buscarPorId: async (id) => {
    const result = await db.execute({
      sql: "SELECT * FROM entregas WHERE id = ?",
      args: [id],
    });
    return result.rows[0];
  },

  criar: async (entrega) => {
    const result = await db.execute({
      sql: `INSERT INTO entregas (data, horario, descricao, antecedencia_minutos, alexa_reminder_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        entrega.data,
        entrega.horario,
        entrega.descricao,
        entrega.antecedencia_minutos || 30,
        entrega.alexa_reminder_id || null,
      ],
    });
    return { id: Number(result.lastInsertRowid), ...entrega };
  },

  atualizar: async (id, dados) => {
    return await db.execute({
      sql: `UPDATE entregas
            SET data = ?, horario = ?, descricao = ?, antecedencia_minutos = ?,
                alexa_reminder_id = ?, status = ?
            WHERE id = ?`,
      args: [
        dados.data,
        dados.horario,
        dados.descricao,
        dados.antecedencia_minutos,
        dados.alexa_reminder_id,
        dados.status,
        id,
      ],
    });
  },

  atualizarReminderId: async (id, reminderId) => {
    return await db.execute({
      sql: "UPDATE entregas SET alexa_reminder_id = ? WHERE id = ?",
      args: [reminderId, id],
    });
  },

  remover: async (id) => {
    return await db.execute({
      sql: "DELETE FROM entregas WHERE id = ?",
      args: [id],
    });
  },

  concluir: async (id) => {
    return await db.execute({
      sql: "UPDATE entregas SET status = 'concluida' WHERE id = ?",
      args: [id],
    });
  },

  marcarAtencao: async (id) => {
    return await db.execute({
      sql: "UPDATE entregas SET status = 'atencao' WHERE id = ?",
      args: [id],
    });
  },

  buscarParaAutoConcluir: async () => {
    const result = await db.execute(
      "SELECT * FROM entregas WHERE status = 'agendada'",
    );
    return result.rows;
  },
};

// Funções auxiliares para tokens
const tokens = {
  obter: async () => {
    const result = await db.execute("SELECT * FROM tokens WHERE id = 1");
    return result.rows[0];
  },

  salvar: async (accessToken, refreshToken, expiresIn) => {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Tenta atualizar primeiro
    const existing = await tokens.obter();
    if (existing) {
      return await db.execute({
        sql: `UPDATE tokens SET access_token = ?, refresh_token = COALESCE(?, refresh_token),
              expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
        args: [accessToken, refreshToken, expiresAt],
      });
    } else {
      return await db.execute({
        sql: `INSERT INTO tokens (id, access_token, refresh_token, expires_at, updated_at)
              VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [accessToken, refreshToken, expiresAt],
      });
    }
  },

  estaExpirado: async () => {
    const token = await tokens.obter();
    if (!token || !token.expires_at) return true;
    return new Date(token.expires_at) <= new Date();
  },

  limpar: async () => {
    return await db.execute("DELETE FROM tokens WHERE id = 1");
  },
};

// Funções auxiliares para estoque
const estoque = {
  listar: async () => {
    const result = await db.execute("SELECT * FROM estoque ORDER BY nome ASC");
    return result.rows;
  },

  buscarPorId: async (id) => {
    const result = await db.execute({
      sql: "SELECT * FROM estoque WHERE id = ?",
      args: [id],
    });
    return result.rows[0];
  },

  buscarPorNome: async (nome) => {
    const result = await db.execute({
      sql: "SELECT * FROM estoque WHERE nome = ?",
      args: [nome],
    });
    return result.rows[0];
  },

  adicionar: async (item) => {
    const result = await db.execute({
      sql: "INSERT INTO estoque (nome, quantidade, preco_unitario) VALUES (?, ?, ?)",
      args: [item.nome, item.quantidade || 0, item.preco_unitario || 0],
    });
    return { id: Number(result.lastInsertRowid), ...item };
  },

  atualizar: async (id, dados) => {
    return await db.execute({
      sql: `UPDATE estoque SET nome = ?, quantidade = ?, preco_unitario = ?,
            updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [dados.nome, dados.quantidade, dados.preco_unitario, id],
    });
  },

  adicionarQuantidade: async (id, quantidade) => {
    return await db.execute({
      sql: `UPDATE estoque SET quantidade = quantidade + ?,
            updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [quantidade, id],
    });
  },

  removerQuantidade: async (id, quantidade) => {
    return await db.execute({
      sql: `UPDATE estoque SET quantidade = quantidade - ?,
            updated_at = CURRENT_TIMESTAMP WHERE id = ? AND quantidade >= ?`,
      args: [quantidade, id, quantidade],
    });
  },

  remover: async (id) => {
    return await db.execute({
      sql: "DELETE FROM estoque WHERE id = ?",
      args: [id],
    });
  },
};

// Funções auxiliares para itens do pedido
const itensPedido = {
  listarPorEntrega: async (entregaId) => {
    const result = await db.execute({
      sql: `SELECT ip.*, e.nome, e.preco_unitario
            FROM itens_pedido ip
            JOIN estoque e ON ip.estoque_id = e.id
            WHERE ip.entrega_id = ?`,
      args: [entregaId],
    });
    return result.rows;
  },

  adicionar: async (entregaId, estoqueId, quantidade) => {
    return await db.execute({
      sql: "INSERT INTO itens_pedido (entrega_id, estoque_id, quantidade) VALUES (?, ?, ?)",
      args: [entregaId, estoqueId, quantidade],
    });
  },

  removerPorEntrega: async (entregaId) => {
    return await db.execute({
      sql: "DELETE FROM itens_pedido WHERE entrega_id = ?",
      args: [entregaId],
    });
  },
};

module.exports = { db, initDatabase, entregas, tokens, estoque, itensPedido };

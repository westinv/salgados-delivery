// database.js - Configuração do banco SQLite
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Define o caminho do banco de dados
// Em produção (Render), usa o disco persistente
// Em desenvolvimento, usa o diretório local
let dbPath;
if (process.env.NODE_ENV === "production") {
  const dataDir = "/opt/render/project/src/data";
  // Cria o diretório se não existir
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dbPath = path.join(dataDir, "entregas.db");
} else {
  dbPath = path.join(__dirname, "entregas.db");
}

// Cria/conecta ao banco de dados
const db = new Database(dbPath);

// Ativa foreign keys
db.pragma("journal_mode = WAL");

// Cria tabela de entregas
db.exec(`
    CREATE TABLE IF NOT EXISTS entregas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data DATE NOT NULL,
        horario TIME NOT NULL,
        descricao TEXT NOT NULL,
        antecedencia_minutos INTEGER DEFAULT 30,
        alexa_reminder_id TEXT,
        status TEXT DEFAULT 'agendada',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Cria tabela de tokens (armazena um único registro)
db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        access_token TEXT,
        refresh_token TEXT,
        expires_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Cria tabela de estoque de salgados
db.exec(`
    CREATE TABLE IF NOT EXISTS estoque (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        quantidade INTEGER DEFAULT 0,
        preco_unitario REAL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Cria tabela de itens do pedido (relaciona entregas com estoque)
db.exec(`
    CREATE TABLE IF NOT EXISTS itens_pedido (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entrega_id INTEGER NOT NULL,
        estoque_id INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        FOREIGN KEY (entrega_id) REFERENCES entregas(id) ON DELETE CASCADE,
        FOREIGN KEY (estoque_id) REFERENCES estoque(id)
    )
`);

// Funções auxiliares para entregas
const entregas = {
  // Lista todas as entregas
  listar: () => {
    return db
      .prepare(
        `
            SELECT * FROM entregas
            ORDER BY data ASC, horario ASC
        `,
      )
      .all();
  },

  // Busca entrega por ID
  buscarPorId: (id) => {
    return db.prepare("SELECT * FROM entregas WHERE id = ?").get(id);
  },

  // Cria nova entrega
  criar: (entrega) => {
    const stmt = db.prepare(`
            INSERT INTO entregas (data, horario, descricao, antecedencia_minutos, alexa_reminder_id)
            VALUES (?, ?, ?, ?, ?)
        `);
    const result = stmt.run(
      entrega.data,
      entrega.horario,
      entrega.descricao,
      entrega.antecedencia_minutos || 30,
      entrega.alexa_reminder_id || null,
    );
    return { id: result.lastInsertRowid, ...entrega };
  },

  // Atualiza entrega
  atualizar: (id, dados) => {
    const stmt = db.prepare(`
            UPDATE entregas
            SET data = ?, horario = ?, descricao = ?, antecedencia_minutos = ?,
                alexa_reminder_id = ?, status = ?
            WHERE id = ?
        `);
    return stmt.run(
      dados.data,
      dados.horario,
      dados.descricao,
      dados.antecedencia_minutos,
      dados.alexa_reminder_id,
      dados.status,
      id,
    );
  },

  // Atualiza apenas o reminder_id da Alexa
  atualizarReminderId: (id, reminderId) => {
    const stmt = db.prepare(`
            UPDATE entregas SET alexa_reminder_id = ? WHERE id = ?
        `);
    return stmt.run(reminderId, id);
  },

  // Remove entrega
  remover: (id) => {
    return db.prepare("DELETE FROM entregas WHERE id = ?").run(id);
  },

  // Marca entrega como concluída
  concluir: (id) => {
    return db
      .prepare(
        `
            UPDATE entregas SET status = 'concluida' WHERE id = ?
        `,
      )
      .run(id);
  },

  // Marca entrega como atenção (auto-concluída após 2h)
  marcarAtencao: (id) => {
    return db
      .prepare(
        `
            UPDATE entregas SET status = 'atencao' WHERE id = ?
        `,
      )
      .run(id);
  },

  // Busca entregas que passaram 2h do horário e ainda estão agendadas
  buscarParaAutoConcluir: () => {
    return db
      .prepare(
        `
            SELECT * FROM entregas
            WHERE status = 'agendada'
        `,
      )
      .all();
  },
};

// Funções auxiliares para tokens
const tokens = {
  // Obtém os tokens salvos
  obter: () => {
    return db.prepare("SELECT * FROM tokens WHERE id = 1").get();
  },

  // Salva ou atualiza tokens
  salvar: (accessToken, refreshToken, expiresIn) => {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const stmt = db.prepare(`
            INSERT INTO tokens (id, access_token, refresh_token, expires_at, updated_at)
            VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                access_token = excluded.access_token,
                refresh_token = COALESCE(excluded.refresh_token, tokens.refresh_token),
                expires_at = excluded.expires_at,
                updated_at = CURRENT_TIMESTAMP
        `);
    return stmt.run(accessToken, refreshToken, expiresAt);
  },

  // Verifica se o token está expirado
  estaExpirado: () => {
    const token = tokens.obter();
    if (!token || !token.expires_at) return true;
    return new Date(token.expires_at) <= new Date();
  },

  // Remove tokens
  limpar: () => {
    return db.prepare("DELETE FROM tokens WHERE id = 1").run();
  },
};

// Funções auxiliares para estoque
const estoque = {
  // Lista todos os itens do estoque
  listar: () => {
    return db
      .prepare(
        `
      SELECT * FROM estoque ORDER BY nome ASC
    `,
      )
      .all();
  },

  // Busca item por ID
  buscarPorId: (id) => {
    return db.prepare("SELECT * FROM estoque WHERE id = ?").get(id);
  },

  // Busca item por nome
  buscarPorNome: (nome) => {
    return db.prepare("SELECT * FROM estoque WHERE nome = ?").get(nome);
  },

  // Adiciona novo item ao estoque
  adicionar: (item) => {
    const stmt = db.prepare(`
      INSERT INTO estoque (nome, quantidade, preco_unitario)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(
      item.nome,
      item.quantidade || 0,
      item.preco_unitario || 0,
    );
    return { id: result.lastInsertRowid, ...item };
  },

  // Atualiza item do estoque
  atualizar: (id, dados) => {
    const stmt = db.prepare(`
      UPDATE estoque
      SET nome = ?, quantidade = ?, preco_unitario = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(dados.nome, dados.quantidade, dados.preco_unitario, id);
  },

  // Adiciona quantidade ao estoque
  adicionarQuantidade: (id, quantidade) => {
    const stmt = db.prepare(`
      UPDATE estoque
      SET quantidade = quantidade + ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(quantidade, id);
  },

  // Remove quantidade do estoque (para pedidos)
  removerQuantidade: (id, quantidade) => {
    const stmt = db.prepare(`
      UPDATE estoque
      SET quantidade = quantidade - ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND quantidade >= ?
    `);
    return stmt.run(quantidade, id, quantidade);
  },

  // Remove item do estoque
  remover: (id) => {
    return db.prepare("DELETE FROM estoque WHERE id = ?").run(id);
  },
};

// Funções auxiliares para itens do pedido
const itensPedido = {
  // Lista itens de um pedido
  listarPorEntrega: (entregaId) => {
    return db
      .prepare(
        `
      SELECT ip.*, e.nome, e.preco_unitario
      FROM itens_pedido ip
      JOIN estoque e ON ip.estoque_id = e.id
      WHERE ip.entrega_id = ?
    `,
      )
      .all(entregaId);
  },

  // Adiciona item ao pedido
  adicionar: (entregaId, estoqueId, quantidade) => {
    const stmt = db.prepare(`
      INSERT INTO itens_pedido (entrega_id, estoque_id, quantidade)
      VALUES (?, ?, ?)
    `);
    return stmt.run(entregaId, estoqueId, quantidade);
  },

  // Remove itens de um pedido
  removerPorEntrega: (entregaId) => {
    return db
      .prepare("DELETE FROM itens_pedido WHERE entrega_id = ?")
      .run(entregaId);
  },
};

module.exports = { db, entregas, tokens, estoque, itensPedido };

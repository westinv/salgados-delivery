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
} else if (process.env.NODE_ENV === "test") {
  // Teste - Banco local isolado
  db = createClient({
    url: "file:test.db",
  });
  console.log("Usando SQLite local para testes (test.db)");
} else {
  // Desenvolvimento - SQLite local
  db = createClient({
    url: "file:entregas.db",
  });
  console.log("Usando SQLite local");
}

function extrairNomeClienteDeDescricao(descricao) {
  let nome = descricao;
  const partes = nome.split(" - ");
  if (partes.length > 1 && partes[0].includes("x ")) {
    nome = partes.slice(1).join(" - ");
  }
  nome = nome.replace(/\s*\[.*?\]\s*/g, "").trim();
  return nome;
}

async function backfillClienteFromDescricao() {
  const result = await db.execute(
    "SELECT id, descricao FROM entregas WHERE cliente IS NULL OR cliente = ''",
  );
  for (const row of result.rows) {
    const nome = extrairNomeClienteDeDescricao(row.descricao);
    if (nome) {
      await db.execute({
        sql: "UPDATE entregas SET cliente = ? WHERE id = ?",
        args: [nome, row.id],
      });
    }
  }
  if (result.rows.length > 0) {
    console.log(
      `Backfill de cliente aplicado em ${result.rows.length} entrega(s) antiga(s)`,
    );
  }
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

  // Adiciona coluna embalagem se não existir (migração)
  try {
    await db.execute(
      `ALTER TABLE entregas ADD COLUMN embalagem TEXT DEFAULT ''`,
    );
    console.log("Coluna 'embalagem' adicionada");
  } catch (e) {
    // Coluna já existe, ignora
  }

  // Adiciona coluna notificado nas entregas (migração)
  try {
    await db.execute(
      `ALTER TABLE entregas ADD COLUMN notificado INTEGER DEFAULT 0`,
    );
    console.log("Coluna 'notificado' adicionada em entregas");
  } catch (e) {
    // Coluna já existe, ignora
  }

  try {
    await db.execute(`ALTER TABLE entregas ADD COLUMN cliente TEXT DEFAULT ''`);
    console.log("Coluna 'cliente' adicionada em entregas");
  } catch (e) {}

  await backfillClienteFromDescricao();

  // Cria tabela de lembretes
  await db.execute(`
    CREATE TABLE IF NOT EXISTS lembretes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        horario TEXT NOT NULL,
        descricao TEXT NOT NULL,
        antecedencia_minutos INTEGER DEFAULT 30,
        status TEXT DEFAULT 'agendado',
        notificado INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Adiciona coluna notificado nos lembretes (migração)
  try {
    await db.execute(
      `ALTER TABLE lembretes ADD COLUMN notificado INTEGER DEFAULT 0`,
    );
    console.log("Coluna 'notificado' adicionada em lembretes");
  } catch (e) {
    // Coluna já existe, ignora
  }

  // Cria tabela de lembretes mensais (recorrentes)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS lembretes_mensais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT NOT NULL,
        dia_do_mes INTEGER NOT NULL,
        horario TEXT NOT NULL,
        antecedencia_minutos INTEGER DEFAULT 30,
        ativo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Adiciona coluna lembrete_mensal_id nos lembretes (migração)
  try {
    await db.execute(
      `ALTER TABLE lembretes ADD COLUMN lembrete_mensal_id INTEGER DEFAULT NULL`,
    );
    console.log("Coluna 'lembrete_mensal_id' adicionada em lembretes");
  } catch (e) {
    // Coluna já existe, ignora
  }

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

  // Cria tabela de log do estoque
  await db.execute(`
    CREATE TABLE IF NOT EXISTS estoque_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estoque_id INTEGER,
        nome_produto TEXT NOT NULL,
        tipo TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        quantidade_anterior INTEGER,
        quantidade_depois INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria tabela de usuários (login fixo, sem cadastro)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        senha_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria tabela de sessões
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cria usuário padrão se não existir (senha: simone123)
  const userExists = await db.execute("SELECT * FROM usuarios WHERE id = 1");
  if (userExists.rows.length === 0) {
    // Hash simples para a senha padrão "simone123"
    await db.execute({
      sql: "INSERT INTO usuarios (id, senha_hash) VALUES (1, ?)",
      args: ["simone123"],
    });
    console.log("Usuário padrão criado (senha: simone123)");
  }

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
      sql: `INSERT INTO entregas (data, horario, descricao, cliente, embalagem, antecedencia_minutos, alexa_reminder_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entrega.data,
        entrega.horario,
        entrega.descricao,
        entrega.cliente || "",
        entrega.embalagem || "",
        entrega.antecedencia_minutos || 30,
        entrega.alexa_reminder_id || null,
      ],
    });
    return { id: Number(result.lastInsertRowid), ...entrega };
  },

  atualizar: async (id, dados) => {
    return await db.execute({
      sql: `UPDATE entregas
            SET data = ?, horario = ?, descricao = ?, cliente = ?, embalagem = ?, antecedencia_minutos = ?,
                alexa_reminder_id = ?, status = ?
            WHERE id = ?`,
      args: [
        dados.data,
        dados.horario,
        dados.descricao,
        dados.cliente || "",
        dados.embalagem || "",
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

  marcarNotificado: async (id) => {
    return await db.execute({
      sql: "UPDATE entregas SET notificado = 1 WHERE id = ?",
      args: [id],
    });
  },
};

// Funções auxiliares para lembretes
const lembretes = {
  listar: async () => {
    const result = await db.execute(
      "SELECT * FROM lembretes ORDER BY data ASC, horario ASC",
    );
    return result.rows;
  },

  buscarPorId: async (id) => {
    const result = await db.execute({
      sql: "SELECT * FROM lembretes WHERE id = ?",
      args: [id],
    });
    return result.rows[0];
  },

  criar: async (lembrete) => {
    const result = await db.execute({
      sql: `INSERT INTO lembretes (data, horario, descricao, antecedencia_minutos, lembrete_mensal_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        lembrete.data,
        lembrete.horario,
        lembrete.descricao,
        lembrete.antecedencia_minutos || 30,
        lembrete.lembrete_mensal_id || null,
      ],
    });
    return { id: Number(result.lastInsertRowid), ...lembrete };
  },

  atualizar: async (id, dados) => {
    return await db.execute({
      sql: `UPDATE lembretes
            SET data = ?, horario = ?, descricao = ?, antecedencia_minutos = ?, status = ?
            WHERE id = ?`,
      args: [
        dados.data,
        dados.horario,
        dados.descricao,
        dados.antecedencia_minutos,
        dados.status,
        id,
      ],
    });
  },

  remover: async (id) => {
    return await db.execute({
      sql: "DELETE FROM lembretes WHERE id = ?",
      args: [id],
    });
  },

  concluir: async (id) => {
    return await db.execute({
      sql: "UPDATE lembretes SET status = 'concluido' WHERE id = ?",
      args: [id],
    });
  },

  buscarParaAutoConcluir: async () => {
    const result = await db.execute(
      "SELECT * FROM lembretes WHERE status = 'agendado'",
    );
    return result.rows;
  },

  marcarNotificado: async (id) => {
    return await db.execute({
      sql: "UPDATE lembretes SET notificado = 1 WHERE id = ?",
      args: [id],
    });
  },

  buscarPorMensalId: async (mensalId) => {
    const result = await db.execute({
      sql: "SELECT * FROM lembretes WHERE lembrete_mensal_id = ? ORDER BY data DESC",
      args: [mensalId],
    });
    return result.rows;
  },

  buscarPendentesPorMensalId: async (mensalId) => {
    const result = await db.execute({
      sql: "SELECT * FROM lembretes WHERE lembrete_mensal_id = ? AND status = 'agendado'",
      args: [mensalId],
    });
    return result.rows;
  },

  removerPorMensalId: async (mensalId) => {
    return await db.execute({
      sql: "DELETE FROM lembretes WHERE lembrete_mensal_id = ? AND status = 'agendado'",
      args: [mensalId],
    });
  },
};

// Funções auxiliares para lembretes mensais
const lembretesMensais = {
  listar: async () => {
    const result = await db.execute(
      "SELECT * FROM lembretes_mensais ORDER BY dia_do_mes ASC, horario ASC",
    );
    return result.rows;
  },

  listarAtivos: async () => {
    const result = await db.execute(
      "SELECT * FROM lembretes_mensais WHERE ativo = 1 ORDER BY dia_do_mes ASC, horario ASC",
    );
    return result.rows;
  },

  buscarPorId: async (id) => {
    const result = await db.execute({
      sql: "SELECT * FROM lembretes_mensais WHERE id = ?",
      args: [id],
    });
    return result.rows[0];
  },

  criar: async (lembrete) => {
    const result = await db.execute({
      sql: `INSERT INTO lembretes_mensais (descricao, dia_do_mes, horario, antecedencia_minutos)
            VALUES (?, ?, ?, ?)`,
      args: [
        lembrete.descricao,
        lembrete.dia_do_mes,
        lembrete.horario,
        lembrete.antecedencia_minutos || 30,
      ],
    });
    return { id: Number(result.lastInsertRowid), ...lembrete };
  },

  atualizar: async (id, dados) => {
    return await db.execute({
      sql: `UPDATE lembretes_mensais
            SET descricao = ?, dia_do_mes = ?, horario = ?, antecedencia_minutos = ?
            WHERE id = ?`,
      args: [
        dados.descricao,
        dados.dia_do_mes,
        dados.horario,
        dados.antecedencia_minutos,
        id,
      ],
    });
  },

  remover: async (id) => {
    return await db.execute({
      sql: "DELETE FROM lembretes_mensais WHERE id = ?",
      args: [id],
    });
  },

  pausar: async (id) => {
    return await db.execute({
      sql: "UPDATE lembretes_mensais SET ativo = 0 WHERE id = ?",
      args: [id],
    });
  },

  ativar: async (id) => {
    return await db.execute({
      sql: "UPDATE lembretes_mensais SET ativo = 1 WHERE id = ?",
      args: [id],
    });
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

// Funções auxiliares para log do estoque
const estoqueLog = {
  listar: async (limite = 50) => {
    const result = await db.execute({
      sql: "SELECT * FROM estoque_log ORDER BY created_at DESC LIMIT ?",
      args: [limite],
    });
    return result.rows;
  },

  listarPorProduto: async (estoqueId, limite = 20) => {
    const result = await db.execute({
      sql: "SELECT * FROM estoque_log WHERE estoque_id = ? ORDER BY created_at DESC LIMIT ?",
      args: [estoqueId, limite],
    });
    return result.rows;
  },

  registrar: async (log) => {
    const result = await db.execute({
      sql: `INSERT INTO estoque_log (estoque_id, nome_produto, tipo, quantidade, quantidade_anterior, quantidade_depois)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        log.estoque_id,
        log.nome_produto,
        log.tipo,
        log.quantidade,
        log.quantidade_anterior ?? null,
        log.quantidade_depois ?? null,
      ],
    });
    return { id: Number(result.lastInsertRowid), ...log };
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

// Funções auxiliares para usuários e sessões
const usuarios = {
  verificarSenha: async (senha) => {
    const result = await db.execute("SELECT * FROM usuarios WHERE id = 1");
    if (result.rows.length === 0) return false;
    return result.rows[0].senha_hash === senha;
  },

  alterarSenha: async (novaSenha) => {
    return await db.execute({
      sql: "UPDATE usuarios SET senha_hash = ? WHERE id = 1",
      args: [novaSenha],
    });
  },
};

const sessoes = {
  criar: async () => {
    // Gera token aleatório
    const token =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    // Expira em 7 dias
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await db.execute({
      sql: "INSERT INTO sessoes (token, expires_at) VALUES (?, ?)",
      args: [token, expiresAt],
    });

    return { token, expiresAt };
  },

  verificar: async (token) => {
    if (!token) return false;

    const result = await db.execute({
      sql: "SELECT * FROM sessoes WHERE token = ? AND expires_at > datetime('now')",
      args: [token],
    });

    return result.rows.length > 0;
  },

  remover: async (token) => {
    return await db.execute({
      sql: "DELETE FROM sessoes WHERE token = ?",
      args: [token],
    });
  },

  limparExpiradas: async () => {
    return await db.execute(
      "DELETE FROM sessoes WHERE expires_at <= datetime('now')",
    );
  },
};

module.exports = {
  db,
  initDatabase,
  entregas,
  lembretes,
  lembretesMensais,
  tokens,
  estoque,
  estoqueLog,
  itensPedido,
  usuarios,
  sessoes,
  backfillClienteFromDescricao,
  extrairNomeClienteDeDescricao,
};


import bcrypt from "bcrypt";
import pool from "../db/pool";

async function criarAdmin() {
  const nome = process.env.ADMIN_NOME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const senha = process.env.ADMIN_SENHA;

  if (!nome || !email || !senha) {
    throw new Error("Informe nome, e-mail e senha nas variáveis de ambiente.");
  }

  if (senha.length < 8 || senha.length > 72) {
    throw new Error("A senha deve ter entre 8 e 72 caracteres.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Impede a criação simultânea de dois administradores iniciais.
    await client.query("LOCK TABLE usuarios IN EXCLUSIVE MODE");

    const existente = await client.query(
      "SELECT id FROM usuarios WHERE papel = 'admin' LIMIT 1"
    );

    if (existente.rows.length > 0) {
      throw new Error("Já existe um administrador cadastrado.");
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    const resultado = await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, nome, email, papel`,
      [nome, email, senhaHash]
    );

    await client.query("COMMIT");

    console.log("Administrador criado com sucesso!");
    console.log(resultado.rows[0]);
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    client.release();
    await pool.end();
  }
}

criarAdmin().catch((erro) => {
  console.error("Não foi possível criar o administrador:", erro.message);
  process.exitCode = 1;
});

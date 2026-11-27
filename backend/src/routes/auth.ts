
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import pool from "../db/pool";
import { autenticar } from "../middlewares/autenticar";

const router = Router();

const cadastroSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  telefone: z.string().trim().max(20).optional(),
  senha: z.string().min(6).max(72)
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  senha: z.string().min(1).max(72)
});

function gerarToken(id: number, papel: "cliente" | "admin") {
  const segredo = process.env.JWT_SECRET;

  if (!segredo) {
    throw new Error("JWT_SECRET não configurado.");
  }

  return jwt.sign(
    { id, papel },
    segredo,
    { expiresIn: "1d" }
  );
}

// Cadastro público: sempre cria cliente
router.post("/registro", async (req: Request, res: Response) => {
  try {
    const dados = cadastroSchema.parse(req.body);

    const email = dados.email.toLowerCase();
    const senhaHash = await bcrypt.hash(dados.senha, 12);

    const resultado = await pool.query(
      `INSERT INTO usuarios (nome, email, telefone, senha_hash, papel)
       VALUES ($1, $2, $3, $4, 'cliente')
       RETURNING id, nome, email, telefone, papel`,
      [
        dados.nome,
        email,
        dados.telefone || null,
        senhaHash
      ]
    );

    const usuario = resultado.rows[0];
    const token = gerarToken(usuario.id, usuario.papel);

    return res.status(201).json({
      mensagem: "Conta criada com sucesso!",
      usuario,
      token
    });
  } catch (erro: any) {
    if (erro instanceof z.ZodError) {
      return res.status(400).json({
        mensagem: "Dados inválidos.",
        erros: erro.issues
      });
    }

    if (erro.code === "23505") {
      return res.status(409).json({
        mensagem: "Este e-mail já está cadastrado."
      });
    }

    console.error(erro);

    return res.status(500).json({
      mensagem: "Erro ao criar conta."
    });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const dados = loginSchema.parse(req.body);
    const email = dados.email.toLowerCase();

    const resultado = await pool.query(
      `SELECT id, nome, email, telefone, senha_hash, papel
       FROM usuarios
       WHERE email = $1`,
      [email]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        mensagem: "E-mail ou senha incorretos."
      });
    }

    const usuario = resultado.rows[0];

    const senhaCorreta = await bcrypt.compare(
      dados.senha,
      usuario.senha_hash
    );

    if (!senhaCorreta) {
      return res.status(401).json({
        mensagem: "E-mail ou senha incorretos."
      });
    }

    const token = gerarToken(usuario.id, usuario.papel);

    return res.json({
      mensagem: "Login realizado com sucesso!",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        papel: usuario.papel
      },
      token
    });
  } catch (erro) {
    if (erro instanceof z.ZodError) {
      return res.status(400).json({
        mensagem: "Dados inválidos.",
        erros: erro.issues
      });
    }

    console.error(erro);

    return res.status(500).json({
      mensagem: "Erro ao realizar login."
    });
  }
});

// Usuário autenticado
router.get("/me", autenticar, async (req: Request, res: Response) => {
  try {
    const resultado = await pool.query(
      `SELECT id, nome, email, telefone, papel
       FROM usuarios
       WHERE id = $1`,
      [req.usuario!.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Usuário não encontrado."
      });
    }

    return res.json({ usuario: resultado.rows[0] });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      mensagem: "Erro ao consultar usuário."
    });
  }
});

export default router;

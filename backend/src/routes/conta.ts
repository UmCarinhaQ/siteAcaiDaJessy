
import { Router, Request, Response } from "express";
import { z } from "zod";
import pool from "../db/pool";
import { autenticar } from "../middlewares/autenticar";

const router = Router();

const atualizarSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  telefone: z.string().trim().max(20).optional().nullable()
});

// Consultar dados da conta
router.get("/", autenticar, async (req: Request, res: Response) => {
  try {
    const resultado = await pool.query(
      `SELECT id, nome, email, telefone, papel, criado_em
       FROM usuarios
       WHERE id = $1`,
      [req.usuario!.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Conta não encontrada."
      });
    }

    return res.json({
      usuario: resultado.rows[0]
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      mensagem: "Erro ao consultar conta."
    });
  }
});

// Atualizar dados da conta
router.put("/", autenticar, async (req: Request, res: Response) => {
  try {
    const dados = atualizarSchema.parse(req.body);

    const resultado = await pool.query(
      `UPDATE usuarios
       SET nome = $1, telefone = $2
       WHERE id = $3
       RETURNING id, nome, email, telefone, papel, criado_em`,
      [
        dados.nome,
        dados.telefone || null,
        req.usuario!.id
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Conta não encontrada."
      });
    }

    return res.json({
      mensagem: "Conta atualizada com sucesso!",
      usuario: resultado.rows[0]
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
      mensagem: "Erro ao atualizar conta."
    });
  }
});

export default router;

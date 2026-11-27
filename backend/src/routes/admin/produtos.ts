
import { Router, Request, Response } from "express";
import { z } from "zod";
import pool from "../../db/pool";
import { autenticar } from "../../middlewares/autenticar";
import { apenasAdmin } from "../../middlewares/apenasAdmin";

const router = Router();

router.use(autenticar, apenasAdmin);

const produtoSchema = z.object({
  nome: z.string().trim().min(2).max(150),
  descricao: z.string().trim().max(1000).optional().default(""),
  categoria: z.string().trim().min(1),
  estoque: z.number().int().min(0),
  popular: z.boolean().default(false),
  ativo: z.boolean().default(true),
  tamanhos: z.array(
    z.object({
      nome: z.string().trim().min(1),
      preco: z.number().min(0),
      acomp: z.number().int().min(0).default(3)
    })
  ).min(1)
});

// Listar produtos
router.get("/", async (_req: Request, res: Response) => {
  try {
    const resultado = await pool.query(`
      SELECT
        p.id,
        p.nome,
        p.descricao,
        p.foto_url AS foto,
        p.ativo,
        p.popular,
        p.estoque,
        c.slug AS categoria,
        COALESCE(
          json_agg(
            json_build_object(
              'id', t.id,
              'nome', t.nome,
              'preco', t.preco,
              'acomp', t.max_complementos
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tamanhos
      FROM produtos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN produto_tamanhos t ON t.produto_id = p.id
      GROUP BY p.id, c.slug
      ORDER BY p.id
    `);

    return res.json({ produtos: resultado.rows });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      mensagem: "Erro ao listar produtos."
    });
  }
});

// Cadastrar produto
router.post("/", async (req: Request, res: Response) => {
  const conexao = await pool.connect();

  try {
    const dados = produtoSchema.parse(req.body);

    await conexao.query("BEGIN");

    const categoria = await conexao.query(
      "SELECT id FROM categorias WHERE slug = $1",
      [dados.categoria]
    );

    if (categoria.rows.length === 0) {
      await conexao.query("ROLLBACK");
      return res.status(400).json({
        mensagem: "Categoria não encontrada."
      });
    }

    const produto = await conexao.query(
      `INSERT INTO produtos
       (categoria_id, nome, descricao, estoque, popular, ativo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        categoria.rows[0].id,
        dados.nome,
        dados.descricao,
        dados.estoque,
        dados.popular,
        dados.ativo
      ]
    );

    for (const tamanho of dados.tamanhos) {
      await conexao.query(
        `INSERT INTO produto_tamanhos
         (produto_id, nome, preco, max_complementos)
         VALUES ($1, $2, $3, $4)`,
        [
          produto.rows[0].id,
          tamanho.nome,
          tamanho.preco,
          tamanho.acomp
        ]
      );
    }

    await conexao.query("COMMIT");

    return res.status(201).json({
      mensagem: "Produto cadastrado com sucesso!",
      id: produto.rows[0].id
    });
  } catch (erro) {
    await conexao.query("ROLLBACK");

    if (erro instanceof z.ZodError) {
      return res.status(400).json({
        mensagem: "Dados inválidos.",
        erros: erro.issues
      });
    }

    console.error(erro);
    return res.status(500).json({
      mensagem: "Erro ao cadastrar produto."
    });
  } finally {
    conexao.release();
  }
});

// Editar produto
router.put("/:id", async (req: Request, res: Response) => {
  const conexao = await pool.connect();

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID inválido."
      });
    }

    const dados = produtoSchema.parse(req.body);

    await conexao.query("BEGIN");

    const categoria = await conexao.query(
      "SELECT id FROM categorias WHERE slug = $1",
      [dados.categoria]
    );

    if (categoria.rows.length === 0) {
      await conexao.query("ROLLBACK");
      return res.status(400).json({
        mensagem: "Categoria não encontrada."
      });
    }

    const atualizado = await conexao.query(
      `UPDATE produtos
       SET categoria_id = $1,
           nome = $2,
           descricao = $3,
           estoque = $4,
           popular = $5,
           ativo = $6
       WHERE id = $7
       RETURNING id`,
      [
        categoria.rows[0].id,
        dados.nome,
        dados.descricao,
        dados.estoque,
        dados.popular,
        dados.ativo,
        id
      ]
    );

    if (atualizado.rows.length === 0) {
      await conexao.query("ROLLBACK");
      return res.status(404).json({
        mensagem: "Produto não encontrado."
      });
    }

    await conexao.query(
      "DELETE FROM produto_tamanhos WHERE produto_id = $1",
      [id]
    );

    for (const tamanho of dados.tamanhos) {
      await conexao.query(
        `INSERT INTO produto_tamanhos
         (produto_id, nome, preco, max_complementos)
         VALUES ($1, $2, $3, $4)`,
        [id, tamanho.nome, tamanho.preco, tamanho.acomp]
      );
    }

    await conexao.query("COMMIT");

    return res.json({
      mensagem: "Produto atualizado com sucesso!"
    });
  } catch (erro) {
    await conexao.query("ROLLBACK");

    if (erro instanceof z.ZodError) {
      return res.status(400).json({
        mensagem: "Dados inválidos.",
        erros: erro.issues
      });
    }

    console.error(erro);
    return res.status(500).json({
      mensagem: "Erro ao atualizar produto."
    });
  } finally {
    conexao.release();
  }
});

// Desativar produto sem apagar histórico
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID inválido."
      });
    }

    const resultado = await pool.query(
      `UPDATE produtos
       SET ativo = false
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Produto não encontrado."
      });
    }

    return res.json({
      mensagem: "Produto desativado com sucesso!"
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({
      mensagem: "Erro ao desativar produto."
    });
  }
});

export default router;


import { Router } from "express";
import pool from "../db/pool";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [
      categoriasResult,
      produtosResult,
      tamanhosResult,
      adicionaisResult,
      complementosResult,
    ] = await Promise.all([
      pool.query(`
        SELECT
          slug AS id,
          nome,
          true AS ativa
        FROM categorias
        WHERE ativa = true
        ORDER BY id
      `),

      pool.query(`
        SELECT
          p.id,
          c.slug AS categoria,
          p.nome,
          p.descricao,
          p.foto_url AS foto,
          p.popular,
          p.estoque,
          true AS ativo
        FROM produtos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE p.ativo = true
        ORDER BY p.id
      `),

      pool.query(`
        SELECT
          id,
          produto_id,
          nome,
          preco::float AS preco,
          max_complementos AS acomp
        FROM produto_tamanhos
        ORDER BY produto_id, id
      `),

      pool.query(`
        SELECT
          id::text AS id,
          nome,
          preco::float AS preco,
          estoque,
          true AS ativo
        FROM adicionais
        WHERE ativo = true
        ORDER BY id
      `),

      pool.query(`
        SELECT
          id::text AS id,
          nome,
          true AS ativo
        FROM complementos
        WHERE ativo = true
        ORDER BY id
      `),
    ]);

    const produtos = produtosResult.rows.map((produto) => ({
      ...produto,
      tamanhos: tamanhosResult.rows.filter(
        (tamanho) => tamanho.produto_id === produto.id
      ),
    }));

    return res.json({
      categorias: categoriasResult.rows,
      produtos,
      adicionais: adicionaisResult.rows,
      complementos: complementosResult.rows,
    });
  } catch (erro) {
    console.error("Erro ao buscar cardápio:", erro);

    return res.status(500).json({
      mensagem: "Erro ao carregar o cardápio.",
    });
  }
});

export default router;

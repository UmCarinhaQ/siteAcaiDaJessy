
'use strict';

const Api = {
  async carregarCardapio() {
    try {
      const resposta = await fetch('http://localhost:3000/api/cardapio');

      if (!resposta.ok) {
        throw new Error('Erro ao buscar cardápio.');
      }

      const dados = await resposta.json();

      // Categorias
      DB.set('categorias', dados.categorias.map(c => ({
        id: c.id,
        nome: c.nome,
        ativa: c.ativa
      })));

      // Produtos e tamanhos
      DB.set('produtos', dados.produtos.map(p => ({
        id: Number(p.id),
        categoria: p.categoria,
        nome: p.nome,
        descricao: p.descricao,
        foto: p.foto || '',
        ativo: p.ativo,
        popular: p.popular,
        estoque: Number(p.estoque),
        tamanhos: p.tamanhos.map(t => ({
          id: Number(t.id),
          nome: t.nome,
          preco: Number(t.preco),
          acomp: Number(t.acomp)
        }))
      })));

      // Adicionais
      DB.set('adicionais', dados.adicionais.map(a => ({
        id: String(a.id),
        nome: a.nome,
        preco: Number(a.preco),
        estoque: Number(a.estoque),
        ativo: a.ativo
      })));

      // Complementos
      DB.set('complementos', dados.complementos.map(c => ({
        id: String(c.id),
        nome: c.nome,
        ativo: c.ativo
      })));

      console.log('Cardápio carregado do PostgreSQL!');

      return true;

    } catch (erro) {
      console.error('Erro ao carregar cardápio:', erro);

      if (typeof UI !== 'undefined') {
        UI.toast('Não foi possível conectar ao servidor. Usando dados locais.', 'erro');
      }

      return false;
    }
  }
};

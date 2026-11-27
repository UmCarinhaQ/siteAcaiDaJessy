# Arquitetura e próximos passos (frontend, backend e PostgreSQL)

## Visão geral

```
Navegador (esta pasta)  ──fetch/JSON──▶  API Node + Express + TypeScript  ──pg──▶  PostgreSQL
HTML, CSS e JS                           regras, login, preços, estoque          database/schema.sql
```
cd ../siteAcaiDaJessy
## Banco de dados (PowerShell, no Windows)

```powershell
psql -U postgres -c 'CREATE DATABASE "BancoAcaidaJessy";'
psql -U postgres -d BancoAcaidaJessy -f database/schema.sql
```
Você também pode abrir o `schema.sql` no pgAdmin (Query Tool) e executar. O script cria as tabelas e
insere os mesmos dados de exemplo do site.

## Estrutura sugerida do backend

```
backend/
├── package.json            express, pg, bcrypt, jsonwebtoken, zod, helmet, cors, dotenv, multer
├── .env                    DATABASE_URL, JWT_SECRET, FRONTEND_URL  (nunca vá para o Git)
└── src/
    ├── server.ts           sobe o servidor
    ├── app.ts              middlewares globais (helmet, cors, json, limite de requisições)
    ├── db/pool.ts          conexão com o PostgreSQL
    ├── middlewares/        autenticar.ts, apenasAdmin.ts, tratarErro.ts
    ├── routes/             auth.ts, cardapio.ts, pedidos.ts, conta.ts, admin/*.ts
    └── services/           pedidos.ts (calcula total e baixa estoque numa transação), whatsapp.ts
```

## Rotas da API

| Método e rota | Quem acessa | O que faz |
|---|---|---|
| `POST /api/auth/cadastro`, `/login`, `/logout`, `/recuperar` | público | Conta e sessão (cookie httpOnly) |
| `GET /api/cardapio` | público | Categorias, produtos, adicionais, complementos |
| `GET /api/entrega/bairros`, `GET /api/loja` | público | Taxas, horário, endereço |
| `POST /api/pedidos` | cliente | Cria o pedido (o servidor recalcula preços e taxa) |
| `GET /api/pedidos/:id` | dono do pedido ou admin | Status e histórico |
| `GET/PUT /api/conta`, `/api/conta/enderecos` | cliente | Perfil e endereços |
| `POST /api/avaliacoes` | cliente | Nova avaliação |
| `GET/PATCH /api/admin/pedidos`, `/:id/status` | admin | Lista e muda status |
| `CRUD /api/admin/produtos, categorias, adicionais, bairros, avaliacoes` | admin | Gestão |
| `PATCH /api/admin/estoque` | admin | Ajusta quantidades |
| `GET /api/admin/financeiro`, `/clientes` | admin | Relatórios |

## Como migrar o frontend

As telas de hoje leem os dados de forma síncrona (`DB.get(...)`). Ao trocar por API, cada tela passa a
ser `async`: busca os dados com `fetch` e só então monta o HTML. O caminho mais curto:

1. Crie `js/api.js` com funções como `Api.cardapio()` e `Api.criarPedido(dados)`.
2. Faça `Router.render` aceitar telas assíncronas (`html = await r.fn(params, q)`) e mostre `Views.carregando()` enquanto espera.
3. Troque, tela por tela, `DB.get('produtos')` por `await Api.cardapio()`. Os `Actions` e `Forms` continuam iguais.
4. Remova `data.js` e o login de demonstração.

## Checklist antes de publicar

- Senhas com hash (bcrypt) e validação de todos os campos no servidor (zod).
- O servidor recalcula subtotal, taxa e total a partir do banco. Nunca confie nos valores enviados pelo navegador.
- Baixa de estoque dentro de uma transação, para dois pedidos simultâneos não venderem a última unidade.
- Rotas `/api/admin/*` protegidas por `apenasAdmin`; cookie `httpOnly` + `secure`; limite de tentativas de login.
- HTTPS no domínio, CORS liberado só para o endereço do site, fotos enviadas validadas por tipo e tamanho.
- Troque a senha do administrador e remova o aviso de demonstração da tela de login.
- Pedido pelo WhatsApp continua válido: o backend só grava o pedido antes de abrir a conversa.


import express from "express";
import helmet from "helmet";
import cors from "cors";
import pool from "./db/pool";
import cardapioRoutes from "./routes/cardapio";
import authRoutes from "./routes/auth";
import contaRoutes from "./routes/conta";
import adminRoutes from "./routes/admin";

const app = express();

// Segurança e configurações
app.use(helmet());

app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ],
}));

app.use(express.json({ limit: "10kb" }));

// Rotas
app.get("/", (req, res) => {
  res.json({
    mensagem: "API Açaí da Jessy funcionando!",
    status: "online"
  });
});

app.get("/db-test", async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT NOW() AS horario, current_database() AS banco"
    );

    res.json({
      mensagem: "Conexão com PostgreSQL funcionando!",
      dados: resultado.rows[0],
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      mensagem: "Erro ao conectar com o banco de dados.",
    });
  }
});

app.use("/api/cardapio", cardapioRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/conta", contaRoutes);
app.use("/api/admin", adminRoutes);

export default app;


import { Router } from "express";
import produtosRoutes from "./admin/produtos";

const router = Router();

// Produtos
router.use("/produtos", produtosRoutes);

export default router;

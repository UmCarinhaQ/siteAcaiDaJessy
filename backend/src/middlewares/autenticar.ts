
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface DadosToken {
  id: number;
  papel: "cliente" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      usuario?: DadosToken;
    }
  }
}

export function autenticar(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const cabecalho = req.headers.authorization;

  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    return res.status(401).json({
      mensagem: "Autenticação necessária."
    });
  }

  const token = cabecalho.split(" ")[1];
  const segredo = process.env.JWT_SECRET;

  if (!segredo) {
    return res.status(500).json({
      mensagem: "Configuração de autenticação indisponível."
    });
  }

  try {
    const dados = jwt.verify(token, segredo) as DadosToken;

    req.usuario = {
      id: dados.id,
      papel: dados.papel
    };

    next();
  } catch {
    return res.status(401).json({
      mensagem: "Token inválido ou expirado."
    });
  }
}

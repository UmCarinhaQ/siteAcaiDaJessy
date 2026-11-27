
import { Request, Response, NextFunction } from "express";

export function apenasAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.usuario) {
    return res.status(401).json({
      mensagem: "Autenticação necessária."
    });
  }

  if (req.usuario.papel !== "admin") {
    return res.status(403).json({
      mensagem: "Acesso permitido somente para administradores."
    });
  }

  next();
}

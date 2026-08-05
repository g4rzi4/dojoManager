import { Router } from "express";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === "admin@dojo.com" &&
    password === "123456"
  ) {
    return res.json({
      success: true,
      token: "token_prueba",
      user: {
        id: 1,
        name: "Administrador",
        email,
      },
    });
  }

  return res.status(401).json({
    success: false,
    message: "Correo o contraseña incorrectos",
  });
});

export default router;
import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

const router = express.Router();

// Ruta temporal para crear un admin
router.post("/create-admin", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const existingUser = await User.findOne({ where: { email: "admin@titanium.com" } });
    if (existingUser) {
      return res.status(400).json({ message: "Ya existe un admin con ese correo." });
    }

    const admin = await User.create({
      email: "admin@titanium.com",
      password: hashedPassword,
      role: "administrador",
      isVerified: true,
      authMethod: "normal",
      provider: "local",
    });

    res.status(201).json({ message: "Admin creado correctamente", admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

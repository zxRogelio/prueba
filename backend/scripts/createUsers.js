import bcrypt from "bcryptjs";
import { sequelize } from "../config/sequelize.js";
import { User } from "../models/User.js";

async function createUsers() {
  try {
    await sequelize.authenticate();
    console.log("Conexión a la BD correcta");

    const usersToCreate = [
      {
        email: "entrenador@titanium.com",
        password: "entrenador123",
        role: "entrenador",
        isVerified: true,
        authMethod: "normal",
        provider: "local",
      },
      {
        email: "cliente@titanium.com",
        password: "cliente123",
        role: "cliente",
        isVerified: true,
        authMethod: "normal",
        provider: "local",
      },
    ];

    for (const userData of usersToCreate) {
      const existingUser = await User.findOne({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`Ya existe el usuario: ${userData.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = await User.create({
        ...userData,
        password: hashedPassword,
      });

      console.log(`Usuario creado: ${newUser.email} | Rol: ${newUser.role}`);
    }

    console.log("Proceso terminado");
    process.exit(0);
  } catch (error) {
    console.error("Error al crear usuarios:", error);
    process.exit(1);
  }
}

createUsers();
import bcrypt from "bcrypt";
import { sequelize } from "../config/sequelize.js";
import { User } from "../models/User.js";
import { UserProfile } from "../models/UserProfile.js";

const USER_DATA = {
  email: "castrousuariotitanium@gmail.com",
  password: "Titanium2026!",
  role: "cliente",

  profile: {
    age: 25,
    gender: "male",
    height: 1.72,
    initialWeight: 82,
    targetWeight: 75,
    startDate: "2026-07-17",
    weeklyGymDays: 4,
    activityLevel: "moderate",
    fitnessGoal: "lose",
  },
};

async function createTestUser() {
  const transaction = await sequelize.transaction();

  try {
    const email = USER_DATA.email.trim().toLowerCase();

    const existingUser = await User.findOne({
      where: { email },
      transaction,
    });

    if (existingUser) {
      throw new Error(`Ya existe un usuario con el correo ${email}`);
    }

    const hashedPassword = await bcrypt.hash(USER_DATA.password, 10);

    const user = await User.create(
      {
        email,
        password: hashedPassword,
        role: USER_DATA.role,

        // Permite iniciar sesión sin verificar correo.
        isVerified: true,
        isPendingApproval: false,

        authMethod: "normal",
        provider: "local",
        providerId: null,

        passwordChangesCount: 0,
        passwordChangesDate: null,
        mustChangePassword: false,
      },
      { transaction },
    );

    const profile = await UserProfile.create(
      {
        userId: user.id,
        ...USER_DATA.profile,
      },
      { transaction },
    );

    await transaction.commit();

    console.log("Usuario creado correctamente");
    console.log({
      id: user.id,
      email: user.email,
      role: user.role,
      profileId: profile.id,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("No se pudo crear el usuario:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

createTestUser();
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import {
  sendOTP,
  sendConfirmationEmail,
  sendVerificationEmail,
} from "../utils/sendEmailBrevo.js";
import dotenv from "dotenv";
import { blacklistToken } from "../middleware/tokenBlacklist.js";
import { Session } from "../models/Session.js";
import { generateRandomPassword } from "../utils/passwordPolicy.js";
import { getClientIp } from "../utils/clientIp.js";
const failedAttempts = new Map(); // email => { count, lastAttempt }
dotenv.config();
/* ================================
    🟢 REGISTRO + VERIFICACIÓN CORREO
  ================================= */
export const register = async (req, res) => {
  const { email, password, role = "cliente" } = req.body;

  try {
    // Verificar si ya existe
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    // Crear usuario nuevo
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashed,
      role,
      isVerified: false,
    });

    // Generar token de verificación
    const verifyToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    // Enviar correo de verificación
    await sendVerificationEmail(user.email, verifyToken);

    res.status(201).json({
      message:
        "Usuario registrado. Verifica tu correo antes de iniciar sesión.",
    });
  } catch (err) {
    console.error("❌ Error en registro:", err);
    res.status(400).json({ error: "Error al registrar usuario" });
  }
};

/* ================================
    🟢 REGISTRO DE ENTRENADOR POR ADMIN
  ================================= */
export const adminRegisterTrainer = async (req, res) => {
  const normalizedEmail = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ error: "El correo es obligatorio" });
  }

  try {
    // Verificar si ya existe
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    // Generar contraseña aleatoria
    const randomPassword = generateRandomPassword();
    const hashed = await bcrypt.hash(randomPassword, 10);

    // Crear usuario entrenador
    const user = await User.create({
      email: normalizedEmail,
      password: hashed,
      role: "entrenador",
      isVerified: true, // No necesita verificación
      mustChangePassword: true, // Debe cambiar contraseña en primer login
    });

    res.status(201).json({
      message: "Entrenador registrado exitosamente",
      email: user.email,
      generatedPassword: randomPassword, // Devolver la contraseña generada para que el admin la proporcione al entrenador
    });
  } catch (err) {
    console.error("❌ Error en registro de entrenador:", err);
    res.status(400).json({ error: "Error al registrar entrenador" });
  }
};

/* ================================
    🟡 VERIFICAR CUENTA DESDE LINK
  ================================= */
export const verifyAccount = async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (user.isVerified) {
      return res.status(200).json({ message: "Tu cuenta ya está verificada." });
    }

    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: "Cuenta verificada correctamente." });
  } catch (err) {
    console.error("❌ Error al verificar cuenta:", err.message);
    res.status(400).json({ error: "Token inválido o expirado" });
  }
};

/* ================================
   🔐 LOGIN CON MÉTODOS ADAPTATIVOS
================================ */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    // ⛔ Mensaje genérico si el usuario NO existe
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const attempt = failedAttempts.get(email);
    const now = Date.now();
    const maxAttempts = 3;
    const blockDuration = 5 * 60 * 1000; // 5 minutos

    // Verifica si está bloqueado
    if (attempt && attempt.count >= maxAttempts) {
      const timePassed = now - attempt.lastAttempt;
      if (timePassed < blockDuration) {
        return res.status(429).json({
          error:
            "Demasiados intentos fallidos. Intenta nuevamente en 5 minutos.",
        });
      } else {
        failedAttempts.delete(email); // desbloquea si ya pasó el tiempo
      }
    }

    // Verifica verificación de cuenta
    if (!user.isVerified) {
      return res.status(403).json({
        error: "Debes verificar tu cuenta antes de iniciar sesión.",
      });
    }

    // Verifica contraseña
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      if (failedAttempts.has(email)) {
        const current = failedAttempts.get(email);
        const newCount = current.count + 1;
        failedAttempts.set(email, {
          count: newCount,
          lastAttempt: now,
        });

        if (newCount >= maxAttempts) {
          return res.status(429).json({
            error:
              "Demasiados intentos fallidos. Intenta nuevamente en 5 minutos.",
          });
        } else if (newCount === 3 || newCount === 4) {
          return res.status(401).json({
            // ⛔ Mensaje genérico, no decimos “contraseña incorrecta”
            error: `Credenciales inválidas. Si fallas ${
              maxAttempts - newCount
            } vez más, tu cuenta será bloqueada temporalmente.`,
          });
        }
      } else {
        failedAttempts.set(email, { count: 1, lastAttempt: now });
      }

      // ⛔ Mensaje genérico de credenciales
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Éxito, limpiar intentos
    failedAttempts.delete(email);

    // Flujo 2FA
    switch (user.authMethod) {
      case "otp": {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);
        user.otp = otp;
        user.otpExpires = expires;
        await user.save();
        await sendOTP(email, otp);
        return res.status(200).json({
          message: "OTP enviado al correo",
          twoFactorRequired: true,
          method: "otp",
        });
      }

      case "confirm-link": {
        const token = jwt.sign(
          { id: user.id, role: user.role, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "10m" },
        );
        user.accessToken = token;
        user.isPendingApproval = true;
        await user.save();
        await sendConfirmationEmail(user.email, token);
        return res.status(200).json({
          message: "Correo de confirmación enviado",
          twoFactorRequired: true,
          method: "confirm-link",
        });
      }

      case "totp":
        return res.status(200).json({
          message: "TOTP requerido",
          twoFactorRequired: true,
          method: "totp",
        });

      default: {
        // 👈 Aquí marcamos que ESTA sesión es local
        const accessToken = jwt.sign(
          {
            id: user.id,
            role: user.role,
            email: user.email,
            loginMethod: "local", // 🔐 importante: va dentro del JWT
          },
          process.env.JWT_SECRET,
          { expiresIn: "1h" },
        );

        // Guardar sesión en la base de datos
        await Session.create({
          userId: user.id,
          token: accessToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] || "Desconocido",
        });

        return res.status(200).json({
          message: "Inicio exitoso",
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            rol: user.role, // 👈 usa 'rol' para que tu front siga funcionando
            mustChangePassword: user.mustChangePassword,
          },
          twoFactorRequired: false,
        });
      }
    }
  } catch (err) {
    console.error("❌ Error en login:", err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

/* ================================
    🔵 VERIFICAR OTP
  ================================= */
// controllers/authController.js
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ error: "Correo y código OTP son requeridos" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.warn(" Usuario no encontrado para OTP:", email);
      return res.status(401).json({ error: "OTP inválido o expirado" });
    }

    if (!user.otp || !user.otpExpires) {
      console.warn(" Usuario sin OTP activo:", email, "otp:", user.otp);
      return res.status(401).json({ error: "OTP inválido o expirado" });
    }

    const now = new Date();
    const expiresAt = new Date(user.otpExpires);

    const codeReceived = String(otp).trim();
    const codeStored = String(user.otp).trim();

    if (codeStored !== codeReceived) {
      console.warn(" Código OTP incorrecto para:", email);
      return res.status(401).json({ error: "OTP inválido o expirado" });
    }

    if (expiresAt.getTime() < now.getTime()) {
      console.warn(" OTP expirado para:", email);
      return res.status(401).json({ error: "OTP inválido o expirado" });
    }

    // ✅ OTP válido → limpiamos campos
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // 🚨 IMPORTANTE: ESTA SESIÓN ES LOCAL, NO GOOGLE
    const loginMethod = "local";

    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        loginMethod,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    await Session.create({
      userId: user.id,
      token: accessToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] || "Desconocido",
    });

    return res.json({
      message: "Acceso concedido",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        rol: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err) {
    console.error("❌ Error al verificar OTP:", err);
    res.status(500).json({ error: "Error al verificar OTP" });
  }
};

/* ================================
    🧩 RECUPERAR CONTRASEÑA
  ================================= */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Mensaje genérico para no revelar si el correo existe o no
  const genericMessage =
    "Si el correo está registrado, se ha enviado un código de recuperación";

  try {
    const user = await User.findOne({ where: { email } });

    // Si NO existe el usuario, respondemos igual pero sin hacer nada
    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    // Si SÍ existe, generamos OTP y lo enviamos
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = expires;
    await user.save();

    await sendOTP(email, otp);

    // Respondemos el mismo mensaje genérico
    return res.status(200).json({ message: genericMessage });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};

/* ================================
    🧾 VERIFICAR CÓDIGO RESET
  ================================= */
export const verifyResetOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "Código inválido o expirado" });
    }
    res.status(200).json({ message: "Código válido" });
  } catch (err) {
    res.status(500).json({ error: "Error verificando OTP" });
  }
};

/* ================================
    🔄 CAMBIAR CONTRASEÑA
  ================================= */
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // 1️⃣ Validar política de contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "La nueva contraseña no cumple la política de seguridad: mínimo 8 caracteres, con al menos una mayúscula, una minúscula, un número y un símbolo.",
      });
    }

    // 2️⃣ Validar OTP y usuario
    const user = await User.findOne({ where: { email } });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "OTP inválido o expirado" });
    }

    // 3️⃣ Verificar límite de 3 cambios por día
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const lastDate = user.passwordChangesDate; // puede ser null o "YYYY-MM-DD"

    if (lastDate === today) {
      if (user.passwordChangesCount >= 3) {
        return res.status(429).json({
          error:
            "Ya has cambiado tu contraseña 3 veces hoy. Intenta de nuevo mañana.",
        });
      }
      user.passwordChangesCount += 1;
    } else {
      // Nuevo día: reiniciamos contador
      user.passwordChangesDate = today;
      user.passwordChangesCount = 1;
    }

    // 4️⃣ Hashear y guardar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("Error al resetear contraseña:", err);
    res.status(500).json({ error: "Error al actualizar contraseña" });
  }
};

export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = req.user;

    // Si no debe cambiar contraseña, verificar oldPassword
    if (!user.mustChangePassword) {
      if (!oldPassword) {
        return res.status(400).json({ error: "Contraseña actual requerida" });
      }
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        return res.status(400).json({ error: "Contraseña actual incorrecta" });
      }
    }

    // Validar nueva contraseña
    const { isStrongPassword } = await import("../utils/passwordPolicy.js");
    if (!isStrongPassword(newPassword)) {
      return res
        .status(400)
        .json({
          error:
            "La nueva contraseña no cumple con los requisitos de seguridad",
        });
    }

    // Hashear nueva contraseña
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.mustChangePassword = false; // Ya cambió
    user.passwordChangesCount += 1;
    user.passwordChangesDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    await user.save();

    res.status(200).json({ message: "Contraseña cambiada exitosamente" });
  } catch (err) {
    console.error("❌ Error al cambiar contraseña:", err);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
};
// 🔍 Aceptamos el token de varias formas
export const confirmAccess = async (req, res) => {
  const token =
    req.body.token ||
    req.body.accessToken ||
    req.body.confirmToken ||
    req.query.token;

  if (!token) {
    console.error("❌ confirmAccess sin token recibido:", {
      body: req.body,
      query: req.query,
    });
    return res
      .status(400)
      .json({ error: "Token de confirmación no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ confirmAccess - token decodificado:", decoded);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(403).json({ error: "Usuario no encontrado" });
    }

    // 👇 Esta sesión final cuenta como "local" (flujo interno de tu sistema)
    const loginMethod = "local";

    const finalToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        loginMethod,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 🟢 MUY IMPORTANTE: guardar sesión para que verifyToken la encuentre
    await Session.create({
      userId: user.id,
      token: finalToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] || "Desconocido",
    });

    // Opcional: limpiar flags de pendiente
    user.isPendingApproval = false;
    user.accessToken = null;
    await user.save();

    return res.status(200).json({
      message: "Acceso confirmado",
      token: finalToken,
      user: {
        id: user.id,
        email: user.email,
        rol: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err) {
    console.error(
      "❌ Error al verificar token en confirmAccess:",
      err.name,
      err.message,
    );

    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Token expirado" });
    }

    return res.status(400).json({ error: "Token inválido" });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader =
      req.headers.authorization || req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ error: "Token no proporcionado" });
    }

    const token = authHeader.split(" ")[1];

    // Marcar sesión como revocada en BD (si estás guardando tokens en Session)
    await Session.update({ revoked: true }, { where: { token } });

    // Meter el token a la blacklist en memoria
    blacklistToken(token);

    return res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("Error en logout:", error);
    return res.status(500).json({ error: "Error al cerrar sesión" });
  }
};
// ====================== OAuth con Google ======================

// 1) Redirigir a Google
export const googleAuth = async (req, res) => {
  try {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

    const options = {
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      client_id: process.env.GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: ["openid", "email", "profile"].join(" "),
    };

    const params = new URLSearchParams(options);
    const authUrl = `${rootUrl}?${params.toString()}`;

    return res.redirect(authUrl);
  } catch (error) {
    console.error("Error en googleAuth:", error);
    return res
      .status(500)
      .json({ error: "Error al iniciar el flujo de OAuth con Google" });
  }
};
// 2) Callback que recibe Google
export const googleCallback = async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Código de autorización faltante" });
  }

  try {
    // 2.1 Intercambiar 'code' por tokens en Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code.toString(),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Error al obtener token de Google:", tokenData);
      return res
        .status(500)
        .json({ error: "Error al validar el código de Google" });
    }

    const accessTokenGoogle = tokenData.access_token;

    // 2.2 Obtener información del usuario desde Google
    const userInfoRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessTokenGoogle}`,
        },
      },
    );

    const profile = await userInfoRes.json();

    if (!userInfoRes.ok) {
      console.error("Error al obtener perfil de Google:", profile);
      return res
        .status(500)
        .json({ error: "Error al obtener datos del usuario en Google" });
    }

    const email = profile.email;
    const googleId = profile.sub;
    const emailVerified = profile.email_verified;

    // 2.3 Buscar o crear usuario en nuestra BD
    let user = await User.findOne({
      where: { provider: "google", providerId: googleId },
    });

    if (!user) {
      // Si ya existe como 'local' con ese email, lo vinculamos
      user = await User.findOne({ where: { email } });

      if (user) {
        user.provider = "google";
        user.providerId = googleId;
        if (emailVerified) user.isVerified = true;
        await user.save();
      } else {
        // Si no existe, lo creamos como nuevo cliente
        user = await User.create({
          email,
          password: null, // no usamos contraseña local para OAuth
          role: "cliente",
          isVerified: emailVerified ? true : false,
          provider: "google",
          providerId: googleId,
          // authMethod se queda con el default "normal"
        });
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    // 2.4 Ignoramos authMethod para logins con Google
    //    Siempre creamos sesión directa con loginMethod = "google"
    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        loginMethod: "google", // 👈 clave para tu frontend / middleware
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    await Session.create({
      userId: user.id,
      token: accessToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] || "Desconocido",
    });

    const redirectUrl = `${frontendUrl}/oauth-callback?token=${encodeURIComponent(
      accessToken,
    )}&email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(
      user.role,
    )}`;

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error en googleCallback:", error);
    return res
      .status(500)
      .json({ error: "Error en el callback de autenticación con Google" });
  }
};
export const resendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Correo requerido" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      // respuesta genérica para no filtrar si el correo existe o no
      return res.status(200).json({
        message: "Si el correo está registrado, se ha reenviado el código.",
      });
    }

    // Solo reenviamos si su método es OTP
    if (user.authMethod !== "otp") {
      return res
        .status(400)
        .json({
          error: "Este usuario no tiene activo el método OTP para login.",
        });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    user.otp = otp;
    user.otpExpires = expires;
    await user.save();

    await sendOTP(email, otp);

    return res.status(200).json({
      message: "Se ha reenviado el código al correo registrado.",
    });
  } catch (err) {
    console.error("❌ Error al reenviar OTP de login:", err);
    return res.status(500).json({ error: "Error al reenviar código" });
  }
};

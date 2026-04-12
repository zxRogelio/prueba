import { Op } from "sequelize";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { normalizeIp } from "../utils/clientIp.js";

export const listAdminUsers = async (_req, res) => {
  try {
    const users = await User.findAll({
      where: {
        role: {
          [Op.in]: ["cliente", "entrenador"],
        },
      },
      attributes: [
        "id",
        "email",
        "role",
        "isVerified",
        "mustChangePassword",
        "createdAt",
        "updatedAt",
      ],
      order: [
        ["createdAt", "DESC"],
        ["email", "ASC"],
      ],
    });

    const userIds = users.map((user) => user.id);
    const sessions = userIds.length
      ? await Session.findAll({
          where: {
            userId: {
              [Op.in]: userIds,
            },
          },
          attributes: ["userId", "ipAddress", "createdAt"],
          order: [
            ["userId", "ASC"],
            ["createdAt", "DESC"],
          ],
        })
      : [];

    const latestIpByUserId = new Map();

    sessions.forEach((session) => {
      if (!latestIpByUserId.has(session.userId)) {
        latestIpByUserId.set(session.userId, session.ipAddress || null);
      }
    });

    res.status(200).json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastIpAddress: normalizeIp(latestIpByUserId.get(user.id)) ?? null,
      })),
    });
  } catch (error) {
    console.error("Error al listar usuarios admin:", error);
    res.status(500).json({ error: "No se pudieron cargar los usuarios" });
  }
};

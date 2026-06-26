import { Op } from "sequelize";
import { MembershipPlan, UserSubscription } from "../models/index.js";

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export async function requireActiveSubscription(req, res, next) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        code: "UNAUTHORIZED",
        error: "Usuario no autenticado",
      });
    }

    if (role !== "cliente") {
      return next();
    }

    const today = toDateOnly(new Date());

    const activeSubscription = await UserSubscription.findOne({
      where: {
        userId,
        status: "active",
        startsAt: {
          [Op.lte]: today,
        },
        endsAt: {
          [Op.gte]: today,
        },
      },
      include: [
        {
          model: MembershipPlan,
          as: "plan",
          required: false,
        },
      ],
      order: [["endsAt", "DESC"]],
    });

    if (!activeSubscription) {
      return res.status(403).json({
        ok: false,
        code: "MEMBERSHIP_REQUIRED",
        error: "Necesitas una membresía activa para acceder a las rutinas",
      });
    }

    req.activeSubscription = activeSubscription;

    return next();
  } catch (error) {
    console.error("❌ Error validando membresía activa:", error);

    return res.status(500).json({
      ok: false,
      code: "ACTIVE_SUBSCRIPTION_CHECK_ERROR",
      error: "Error al validar la membresía activa",
    });
  }
}
import { TrainerClient, User } from "../models/index.js";

const ensureTrainer = (req, res) => {
  if (!req.user || req.user.role !== "entrenador") {
    res.status(403).json({ error: "Acceso solo para entrenadores" });
    return false;
  }

  return true;
};

export const listTrainerClients = async (req, res) => {
  if (!ensureTrainer(req, res)) return;

  try {
    const rows = await TrainerClient.findAll({
      where: {
        trainerId: req.user.id,
      },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "email", "role", "isVerified", "createdAt"],
        },
      ],
      order: [["assignedAt", "DESC"]],
    });

    const clients = rows.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      trainerId: row.trainerId,
      status: row.status,
      notes: row.notes,
      assignedAt: row.assignedAt,
      email: row.client?.email ?? "Sin correo",
      isVerified: row.client?.isVerified ?? false,
      createdAt: row.client?.createdAt ?? null,
      subscriptionStatus: "Pendiente",
      activeRoutine: "Sin rutina activa",
    }));

    return res.json({ clients });
  } catch (error) {
    console.error("listTrainerClients error:", error);
    return res.status(500).json({ error: "No se pudieron cargar los clientes" });
  }
};
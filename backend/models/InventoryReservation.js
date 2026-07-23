import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const INVENTORY_RESERVATION_STATUSES = Object.freeze([
  "active",
  "consumed",
  "released",
  "expired",
]);

export const InventoryReservation = sequelize.define(
  "InventoryReservation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },

    status: {
      type: DataTypes.ENUM(...INVENTORY_RESERVATION_STATUSES),
      allowNull: false,
      defaultValue: "active",
      validate: {
        isIn: [INVENTORY_RESERVATION_STATUSES],
      },
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    consumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    releasedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "InventoryReservations",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        fields: ["orderId"],
      },
      {
        fields: ["productId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["expiresAt"],
      },
    ],
  }
);

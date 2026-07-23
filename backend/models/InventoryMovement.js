import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const INVENTORY_MOVEMENT_TYPES = Object.freeze([
  "purchase",
  "sale",
  "return",
  "restock",
  "adjustment",
  "damaged",
  "expired",
]);

export const InventoryMovement = sequelize.define(
  "InventoryMovement",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    orderItemId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    movementType: {
      type: DataTypes.ENUM(...INVENTORY_MOVEMENT_TYPES),
      allowNull: false,
      validate: {
        isIn: [INVENTORY_MOVEMENT_TYPES],
      },
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },

    stockBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    stockAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    reference: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "InventoryMovements",
    schema: "core",
    timestamps: false,
    indexes: [
      {
        fields: ["productId"],
      },
      {
        fields: ["movementType"],
      },
      {
        fields: ["createdAt"],
      },
      {
        fields: ["orderItemId"],
      },
    ],
  }
);

InventoryMovement.beforeValidate((movement) => {
  for (const field of ["reference", "notes"]) {
    if (typeof movement[field] === "string") {
      const trimmed = movement[field].trim();
      movement[field] = trimmed.length > 0 ? trimmed : null;
    }
  }
});

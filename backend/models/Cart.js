import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const CART_STATUSES = Object.freeze([
  "active",
  "converted",
  "abandoned",
  "expired",
]);

export const Cart = sequelize.define(
  "Cart",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(...CART_STATUSES),
      allowNull: false,
      defaultValue: "active",
    },

    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "MXN",
      validate: {
        len: [3, 3],
      },
    },

    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    convertedOrderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "Carts",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        name: "carts_one_active_per_user",
        fields: ["userId"],
        unique: true,
        where: {
          status: "active",
        },
      },
      {
        name: "carts_user_id_idx",
        fields: ["userId"],
      },
      {
        name: "carts_status_idx",
        fields: ["status"],
      },
      {
        name: "carts_converted_order_id_idx",
        fields: ["convertedOrderId"],
      },
      {
        name: "carts_last_activity_at_idx",
        fields: ["lastActivityAt"],
      },
    ],
  }
);

Cart.beforeValidate((cart) => {
  if (cart.currency) {
    cart.currency = String(cart.currency).trim().toUpperCase();
  }
});

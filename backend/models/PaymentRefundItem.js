import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const PaymentRefundItem = sequelize.define(
  "PaymentRefundItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    refundId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    orderItemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },

    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },

    restock: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "PaymentRefundItems",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        name: "payment_refund_items_refund_order_item_unique",
        fields: ["refundId", "orderItemId"],
        unique: true,
      },
      {
        name: "payment_refund_items_refund_id_idx",
        fields: ["refundId"],
      },
      {
        name: "payment_refund_items_order_item_id_idx",
        fields: ["orderItemId"],
      },
    ],
  }
);

import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const OrderDiscount = sequelize.define(
  "OrderDiscount",
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

    orderItemId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    promotionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    description: {
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
    tableName: "OrderDiscounts",
    schema: "core",
    timestamps: false,
    indexes: [
      { fields: ["orderId"] },
      { fields: ["orderItemId"] },
      { fields: ["promotionId"] },
      { fields: ["createdAt"] },
    ],
  }
);

OrderDiscount.beforeValidate((orderDiscount) => {
  if (typeof orderDiscount.description === "string") {
    orderDiscount.description = orderDiscount.description.trim() || null;
  }
});

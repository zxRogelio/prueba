import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const PromotionProduct = sequelize.define(
  "PromotionProduct",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    promotionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "PromotionProducts",
    schema: "core",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["promotionId", "productId"],
      },
      {
        fields: ["promotionId"],
      },
      {
        fields: ["productId"],
      },
    ],
  }
);

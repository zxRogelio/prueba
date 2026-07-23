import { DataTypes, Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const ProductPriceHistory = sequelize.define(
  "ProductPriceHistory",
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

    previousPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    newPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    validFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    validTo: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    changedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    reason: {
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
    tableName: "ProductPriceHistories",
    schema: "core",
    timestamps: false,
    indexes: [
      {
        fields: ["productId"],
      },
      {
        fields: ["validFrom"],
      },
      {
        fields: ["validTo"],
      },
      {
        name: "product_price_histories_one_open_period",
        fields: ["productId"],
        unique: true,
        where: {
          validTo: {
            [Op.eq]: null,
          },
        },
      },
    ],
  }
);

ProductPriceHistory.beforeValidate((history) => {
  if (typeof history.reason === "string") {
    const trimmed = history.reason.trim();
    history.reason = trimmed.length > 0 ? trimmed : null;
  }
});

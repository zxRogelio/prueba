import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const PROMOTION_DISCOUNT_TYPES = Object.freeze([
  "percentage",
  "fixed_amount",
  "special_price",
]);

export const PROMOTION_STATUSES = Object.freeze([
  "draft",
  "active",
  "inactive",
  "expired",
]);

export const Promotion = sequelize.define(
  "Promotion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    discountType: {
      type: DataTypes.ENUM(...PROMOTION_DISCOUNT_TYPES),
      allowNull: false,
    },

    discountValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(...PROMOTION_STATUSES),
      allowNull: false,
      defaultValue: "draft",
    },
  },
  {
    tableName: "Promotions",
    schema: "core",
    timestamps: true,
    indexes: [
      { fields: ["status"] },
      { fields: ["startDate"] },
      { fields: ["endDate"] },
    ],
    validate: {
      validDateRange() {
        if (
          this.startDate &&
          this.endDate &&
          new Date(this.endDate) < new Date(this.startDate)
        ) {
          throw new Error("endDate debe ser mayor o igual que startDate.");
        }
      },
      validDiscountValue() {
        const value = Number(this.discountValue);

        if (!Number.isFinite(value) || value < 0) {
          throw new Error("discountValue debe ser un monto valido.");
        }

        if (this.discountType === "percentage" && value > 100) {
          throw new Error("El descuento percentage no puede exceder 100.");
        }
      },
    },
  }
);

Promotion.beforeValidate((promotion) => {
  if (typeof promotion.name === "string") {
    promotion.name = promotion.name.trim();
  }

  if (typeof promotion.description === "string") {
    promotion.description = promotion.description.trim() || null;
  }
});

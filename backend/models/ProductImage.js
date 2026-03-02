import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const ProductImage = sequelize.define(
  "ProductImage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    publicId: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "product_images",
    timestamps: true,
  }
);

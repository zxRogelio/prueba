import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const ProductImage = sequelize.define(
  "ProductImage",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // ✅ FK a Product.id_producto (clave negocio)
    productId: {
      type: DataTypes.INTEGER,
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
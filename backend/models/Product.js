import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    id_producto: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },

    name: { type: DataTypes.STRING(160), allowNull: false },
    brandId: { type: DataTypes.INTEGER, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },

    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    status: {
      type: DataTypes.ENUM("Activo", "Inactivo"),
      allowNull: false,
      defaultValue: "Activo",
    },

    imageUrl: { type: DataTypes.STRING(500), allowNull: true },

    productType: {
      type: DataTypes.ENUM("Suplementación", "Ropa"),
      allowNull: false,
    },

    description: { type: DataTypes.TEXT, allowNull: true },
    features: { type: DataTypes.TEXT, allowNull: true },

    supplementFlavor: { type: DataTypes.STRING(120), allowNull: true },
    supplementPresentation: { type: DataTypes.STRING(120), allowNull: true },
    supplementServings: { type: DataTypes.STRING(120), allowNull: true },

    apparelSize: { type: DataTypes.STRING(50), allowNull: true },
    apparelColor: { type: DataTypes.STRING(80), allowNull: true },
    apparelMaterial: { type: DataTypes.STRING(120), allowNull: true },
  },
  {
    tableName: "Products",
    schema: "core",
    timestamps: true,
  }
);
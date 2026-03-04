import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Brand = sequelize.define(
  "Brand",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // ✅ Clave de negocio
    id_marca: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },

    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },

    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    // ✅ FK apuntando a Category.id_categoria
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "Brands",
    timestamps: true,
  }
);
import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Category = sequelize.define(
  "Category",
  {
    // PK técnica
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // ✅ Clave de negocio (la que vas a usar para relaciones)
    id_categoria: {
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
  },
  {
    tableName: "Categories",
    timestamps: true,
  }
);
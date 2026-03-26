import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const UserWeightHistory = sequelize.define(
  "UserWeightHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: {
          tableName: "Users",
          schema: "core",
        },
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    recordDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 20,
        max: 400,
      },
    },
    nextAllowedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "UserWeightHistory",
    schema: "core",
    timestamps: true,
  }
);
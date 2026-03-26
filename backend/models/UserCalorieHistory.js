import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const UserCalorieHistory = sequelize.define(
  "UserCalorieHistory",
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
    dailyCalories: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 500,
        max: 10000,
      },
    },
    nextAllowedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "UserCalorieHistory",
    schema: "core",
    timestamps: true,
  }
);
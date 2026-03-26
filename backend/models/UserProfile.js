import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const UserProfile = sequelize.define(
  "UserProfile",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
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
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 10,
        max: 100,
      },
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [["male", "female", "other"]],
      },
    },
    height: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      validate: {
        min: 1.0,
        max: 2.5,
      },
    },
    initialWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 20,
        max: 400,
      },
    },
    targetWeight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 20,
        max: 400,
      },
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    weeklyGymDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 7,
      },
    },
    activityLevel: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [["sedentary", "light", "moderate", "active", "very_active"]],
      },
    },
    fitnessGoal: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [["lose", "maintain", "gain"]],
      },
    },
  },
  {
    tableName: "UserProfiles",
    schema: "core",
    timestamps: true,
  }
);
import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const TrainerProfile = sequelize.define(
  "TrainerProfile",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    trainerId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },

    fullName: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    specialty: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    certifications: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    experienceYears: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    focus: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    photoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    photoPublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "TrainerProfiles",
    schema: "core",
    timestamps: true,
  }
);
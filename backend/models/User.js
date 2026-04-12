// models/User.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otp: DataTypes.STRING,
    otpExpires: DataTypes.DATE,
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isPendingApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    accessToken: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    totpSecret: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    authMethod: {
      type: DataTypes.ENUM("normal", "otp", "totp", "confirm-link"),
      defaultValue: "normal",
    },
    role: {
      type: DataTypes.ENUM("cliente", "entrenador", "administrador"),
      defaultValue: "cliente",
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "local",
    },
    providerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordChangesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    passwordChangesDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "Users",
    schema: "core",
    timestamps: true,
  }
);
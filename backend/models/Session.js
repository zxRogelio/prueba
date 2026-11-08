// models/Session.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { User } from "./User.js";

export const Session = sequelize.define(
  "Session",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID, // ✅ Coincide con el UUID del modelo User
      allowNull: false,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "sessions",
    schema: "core",
    timestamps: true,
    hooks: {
      async beforeCreate(session, options) {
        const owner = await User.findByPk(session.userId, { transaction: options.transaction });
        if (!owner || owner.deletionCompletedAt) throw new Error("Account is unavailable");
      },
    },
  }
);

// Relación con User
Session.belongsTo(User, { foreignKey: "userId" });

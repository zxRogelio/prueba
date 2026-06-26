import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const MembershipPlan = sequelize.define(
  "MembershipPlan",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(140),
      allowNull: false,
      unique: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "individual",
      comment: "visit, individual, student, group",
    },

    durationDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    pricePerPerson: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    minPeople: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    maxPeople: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    requiresStudentProof: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    accessLevel: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "basic",
      comment: "basic, standard, premium",
    },

    benefits: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "MembershipPlans",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        fields: ["slug"],
        unique: true,
      },
      {
        fields: ["type"],
      },
      {
        fields: ["isActive"],
      },
    ],
  }
);
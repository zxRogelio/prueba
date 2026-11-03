import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const AboutPage = sequelize.define(
  "AboutPage",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    slug: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      defaultValue: "main",
    },

    // Hero
    heroLabel: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    heroTitle: {
      type: DataTypes.STRING(220),
      allowNull: false,
      defaultValue: "Acerca de Nosotros",
    },
    heroHighlight: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: "Nosotros",
    },
    heroSubtitle: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    heroImageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    heroImagePublicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Intro
    introTitle: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },
    introHighlight: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    introText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    introImageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    introImagePublicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Stats
    stat1Value: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    stat1Label: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    stat2Value: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    stat2Label: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    stat3Value: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    stat3Label: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    // Mission / Vision / Values principales
    missionTitle: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: "Mision",
    },
    missionText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    missionImageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    missionImagePublicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    visionTitle: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: "Vision",
    },
    visionText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    visionImageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    visionImagePublicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    valuesTitle: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: "Valores",
    },
    valuesText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    valuesImageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    valuesImagePublicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // CTA
    ctaTitle: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },
    ctaText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ctaAddress: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ctaPhone: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    ctaPrimaryButtonText: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    ctaPrimaryButtonLink: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ctaSecondaryButtonText: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    ctaSecondaryButtonLink: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    pickupSettings: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "AboutPages",
    schema: "core",
    timestamps: true,
  },
);

import { DataTypes, Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Receipt = sequelize.define(
  "Receipt",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    folio: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },

    pdfUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "issued",
      comment: "issued, cancelled",
    },

    issuedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },

    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "Receipts",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        name: "receipts_payment_id_unique",
        fields: ["paymentId"],
        unique: true,
        where: {
          paymentId: {
            [Op.ne]: null,
          },
        },
      },
      {
        fields: ["paymentId"],
      },
      {
        fields: ["orderId"],
      },
      {
        fields: ["folio"],
        unique: true,
      },
      {
        fields: ["status"],
      },
    ],
  }
);

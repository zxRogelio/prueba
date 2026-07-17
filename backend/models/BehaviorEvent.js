import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const BEHAVIOR_EVENT_TYPES = Object.freeze([
  "login",
  "product_view",
  "product_search",
  "product_click",
  "add_to_cart",
  "remove_from_cart",
  "quantity_changed",
  "checkout_started",
  "checkout_completed",
  "cart_abandoned",
  "routine_view",
  "routine_started",
  "routine_completed",
  "membership_view",
  "recommendation_view",
  "recommendation_click",
]);

export const BEHAVIOR_ENTITY_TYPES = Object.freeze([
  "product",
  "cart",
  "order",
  "routine",
  "membership_plan",
  "recommendation",
]);

export const BehaviorEvent = sequelize.define(
  "BehaviorEvent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    eventType: {
      type: DataTypes.ENUM(...BEHAVIOR_EVENT_TYPES),
      allowNull: false,
      validate: {
        isIn: [BEHAVIOR_EVENT_TYPES],
      },
    },

    entityType: {
      type: DataTypes.ENUM(...BEHAVIOR_ENTITY_TYPES),
      allowNull: true,
      validate: {
        isIn: [BEHAVIOR_ENTITY_TYPES],
      },
    },

    entityId: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    source: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "BehaviorEvents",
    schema: "core",
    timestamps: false,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["sessionId"],
      },
      {
        fields: ["eventType"],
      },
      {
        fields: ["entityType"],
      },
      {
        fields: ["entityId"],
      },
      {
        fields: ["createdAt"],
      },
    ],
  }
);

BehaviorEvent.beforeValidate((event) => {
  if (typeof event.entityId === "string") {
    const trimmed = event.entityId.trim();
    event.entityId = trimmed.length > 0 ? trimmed : null;
  } else if (event.entityId != null) {
    event.entityId = String(event.entityId);
  }

  if (typeof event.source === "string") {
    const trimmed = event.source.trim();
    event.source = trimmed.length > 0 ? trimmed : null;
  }
});

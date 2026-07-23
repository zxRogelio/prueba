import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const ORDER_ITEM_TYPES = Object.freeze([
  "product",
  "membership",
  "group_membership",
]);

function toCents(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} debe ser un monto valido.`);
  }

  return Math.round(numberValue * 100);
}

export function calculateOrderItemSubtotal({
  quantity,
  unitPrice,
  discountAmount = 0,
}) {
  const quantityValue = Number(quantity);

  if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
    throw new Error("quantity debe ser mayor que cero.");
  }

  const unitPriceCents = toCents(unitPrice, "unitPrice");
  const discountCents = toCents(discountAmount, "discountAmount");

  if (unitPriceCents < 0) {
    throw new Error("unitPrice no puede ser negativo.");
  }

  if (discountCents < 0) {
    throw new Error("discountAmount no puede ser negativo.");
  }

  const subtotalCents = quantityValue * unitPriceCents - discountCents;

  if (subtotalCents < 0) {
    throw new Error("subtotal no puede ser negativo.");
  }

  return (subtotalCents / 100).toFixed(2);
}

export const OrderItem = sequelize.define(
  "OrderItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    itemType: {
      type: DataTypes.ENUM(...ORDER_ITEM_TYPES),
      allowNull: false,
    },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    membershipPlanId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },

    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    itemNameSnapshot: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    itemDescriptionSnapshot: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    categorySnapshot: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    brandSnapshot: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    productTypeSnapshot: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    durationDaysSnapshot: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "OrderItems",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        fields: ["orderId"],
      },
      {
        fields: ["productId"],
      },
      {
        fields: ["membershipPlanId"],
      },
      {
        fields: ["itemType"],
      },
    ],
    validate: {
      itemReferenceMatchesType() {
        if (this.itemType === "product") {
          if (this.productId == null || this.membershipPlanId != null) {
            throw new Error(
              "Los items de producto requieren productId y no permiten membershipPlanId."
            );
          }

          return;
        }

        if (
          ["membership", "group_membership"].includes(this.itemType) &&
          (this.membershipPlanId == null || this.productId != null)
        ) {
          throw new Error(
            "Los items de membresia requieren membershipPlanId y no permiten productId."
          );
        }
      },
    },
  }
);

OrderItem.beforeValidate((orderItem) => {
  if (orderItem.discountAmount == null) {
    orderItem.discountAmount = 0;
  }

  if (orderItem.quantity != null && orderItem.unitPrice != null) {
    orderItem.subtotal = calculateOrderItemSubtotal({
      quantity: orderItem.quantity,
      unitPrice: orderItem.unitPrice,
      discountAmount: orderItem.discountAmount,
    });
  }
});

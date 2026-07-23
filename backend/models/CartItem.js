import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

function toCents(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} debe ser un monto valido.`);
  }

  return Math.round(numberValue * 100);
}

export function calculateCartItemSubtotal({ quantity, unitPriceSnapshot }) {
  const quantityValue = Number(quantity);

  if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
    throw new Error("quantity debe ser mayor que cero.");
  }

  const unitPriceCents = toCents(unitPriceSnapshot, "unitPriceSnapshot");

  if (unitPriceCents < 0) {
    throw new Error("unitPriceSnapshot no puede ser negativo.");
  }

  return ((quantityValue * unitPriceCents) / 100).toFixed(2);
}

export const CartItem = sequelize.define(
  "CartItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    cartId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },

    unitPriceSnapshot: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
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
  },
  {
    tableName: "CartItems",
    schema: "core",
    timestamps: true,
    indexes: [
      {
        name: "cart_items_cart_id_idx",
        fields: ["cartId"],
      },
      {
        name: "cart_items_product_id_idx",
        fields: ["productId"],
      },
    ],
  }
);

CartItem.beforeValidate((cartItem) => {
  if (cartItem.quantity != null && cartItem.unitPriceSnapshot != null) {
    cartItem.subtotal = calculateCartItemSubtotal({
      quantity: cartItem.quantity,
      unitPriceSnapshot: cartItem.unitPriceSnapshot,
    });
  }
});

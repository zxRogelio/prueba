import { sequelize } from "../config/sequelize.js";
import { User, UserAddress } from "../models/index.js";
import { deliveryError, normalizeAddress, uuidField } from "../utils/deliveryValidation.js";

export async function saveUserAddress({ userId, addressId = null, input }) {
  const address = normalizeAddress(input);
  if (addressId) uuidField(addressId, "Dirección");
  if (input.isDefault != null && typeof input.isDefault !== "boolean") throw deliveryError("isDefault debe ser booleano.");
  return sequelize.transaction(async (transaction) => {
    // Serialize all address/default changes for this user, including first insert.
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw deliveryError("Usuario no encontrado.", 404);
    const saved = addressId ? await UserAddress.findOne({ where: { id: addressId, userId }, transaction }) : null;
    if (addressId && !saved) throw deliveryError("Dirección no encontrada.", 404);
    const isDefault = input.isDefault ?? saved?.isDefault ?? false;
    if (isDefault) await UserAddress.update({ isDefault: false }, { where: { userId, isDefault: true }, transaction });
    return saved ? saved.update({ ...address, isDefault }, { transaction })
      : UserAddress.create({ ...address, userId, isDefault }, { transaction });
  });
}

export async function deleteUserAddress({ userId, addressId }) {
  uuidField(addressId, "Dirección");
  return sequelize.transaction(async (transaction) => {
    await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    const count = await UserAddress.destroy({ where: { id: addressId, userId }, transaction });
    if (!count) throw deliveryError("Dirección no encontrada.", 404);
  });
}

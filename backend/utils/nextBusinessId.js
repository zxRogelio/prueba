import { sequelize } from "../config/sequelize.js";

/**
 * Siguiente ID de negocio (MAX + 1) con lock para evitar duplicados concurrentes
 */
export async function getNextId(Model, field, transaction) {
  const row = await Model.findOne({
    attributes: [field],
    order: [[field, "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const currentMax = row ? Number(row.get(field)) : 0;
  return currentMax + 1;
}
import { sequelize } from "../config/sequelize.js";
import { Brand, Category } from "../models/index.js";
import { getNextId } from "../utils/nextBusinessId.js";

export const listBrands = async (req, res) => {
  const { categoryId } = req.query;

  const where = {};
  if (categoryId) where.categoryId = Number(categoryId); // ahora es int (id_categoria)

  const brands = await Brand.findAll({
    where,
    order: [["name", "ASC"]],
  });

  res.json(brands);
};

export const createBrand = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const name = String(req.body?.name || "").trim();
    const categoryIdRaw = req.body?.categoryId;

    if (name.length < 2) {
      await t.rollback();
      return res.status(400).json({ error: "Nombre inválido" });
    }

    const categoryId = categoryIdRaw != null ? Number(categoryIdRaw) : null;
    if (!categoryId) {
      await t.rollback();
      return res.status(400).json({ error: "categoryId es requerido (id_categoria)" });
    }

    // ✅ validar categoría por id_categoria
    const category = await Category.findOne({
      where: { id_categoria: categoryId },
      transaction: t,
      lock: t.LOCK.KEY_SHARE,
    });
    if (!category) {
      await t.rollback();
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    if (!category.active) {
      await t.rollback();
      return res.status(400).json({ error: "Categoría inactiva" });
    }

    const exists = await Brand.findOne({ where: { name }, transaction: t });
    if (exists) {
      await t.rollback();
      return res.status(409).json({ error: "La marca ya existe" });
    }

    // ✅ autogenerar id_marca
    const id_marca = await getNextId(Brand, "id_marca", t);

    const brand = await Brand.create(
      { id_marca, name, categoryId },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json(brand);
  } catch (err) {
    await t.rollback();
    console.error("createBrand error:", err);
    res.status(500).json({ error: "Error creando marca", details: err.message });
  }
};

export const updateBrand = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // 👇 ahora el "id" del endpoint debería ser el id_marca
    const id_marca = Number(req.params.id);

    const name = req.body?.name != null ? String(req.body.name).trim() : null;
    const active = req.body?.active;
    const categoryId = req.body?.categoryId != null ? Number(req.body.categoryId) : null;

    // buscar marca por id_marca (no por PK)
    const brand = await Brand.findOne({
      where: { id_marca },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!brand) {
      await t.rollback();
      return res.status(404).json({ error: "Marca no encontrada" });
    }

    if (name) brand.name = name;
    if (typeof active === "boolean") brand.active = active;

    if (categoryId) {
      const category = await Category.findOne({
        where: { id_categoria: categoryId },
        transaction: t,
        lock: t.LOCK.KEY_SHARE,
      });
      if (!category) {
        await t.rollback();
        return res.status(404).json({ error: "Categoría no encontrada" });
      }
      if (!category.active) {
        await t.rollback();
        return res.status(400).json({ error: "Categoría inactiva" });
      }
      brand.categoryId = categoryId;
    }

    await brand.save({ transaction: t });
    await t.commit();
    res.json(brand);
  } catch (err) {
    await t.rollback();
    console.error("updateBrand error:", err);
    res.status(500).json({ error: "Error actualizando marca", details: err.message });
  }
};

export const deleteBrand = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id_marca = Number(req.params.id);

    const brand = await Brand.findOne({
      where: { id_marca },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!brand) {
      await t.rollback();
      return res.status(404).json({ error: "Marca no encontrada" });
    }

    brand.active = false;
    await brand.save({ transaction: t });

    await t.commit();
    res.json({ message: "Marca desactivada" });
  } catch (err) {
    await t.rollback();
    console.error("deleteBrand error:", err);
    res.status(500).json({ error: "Error desactivando marca", details: err.message });
  }
};
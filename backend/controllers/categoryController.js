import { sequelize } from "../config/sequelize.js";
import { Category, Product } from "../models/index.js";
import { getNextId } from "../utils/nextBusinessId.js";
import {
  cleanupPayloadForKind,
  isValidProductKind,
} from "../utils/productKind.js";

export const listCategories = async (req, res) => {
  const categories = await Category.findAll({ order: [["name", "ASC"]] });
  res.json(categories);
};

export const createCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const name = String(req.body?.name || "").trim();
    if (name.length < 2) {
      await t.rollback();
      return res.status(400).json({ error: "Nombre inválido" });
    }

    const productKind = String(req.body?.productKind || "").trim();
    if (!isValidProductKind(productKind)) {
      await t.rollback();
      return res.status(400).json({ error: "Grupo del producto inválido" });
    }

    const exists = await Category.findOne({ where: { name }, transaction: t });
    if (exists) {
      await t.rollback();
      return res.status(409).json({ error: "La categoría ya existe" });
    }

    // ✅ autogenerar id_categoria
    const id_categoria = await getNextId(Category, "id_categoria", t);

    const category = await Category.create(
      {
        id_categoria,
        name,
        active:
          typeof req.body?.active === "boolean" ? req.body.active : true,
        productKind,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json(category);
  } catch (err) {
    await t.rollback();
    console.error("createCategory error:", err);
    res.status(500).json({ error: "Error creando categoría", details: err.message });
  }
};

export const updateCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // 👇 ahora el "id" del endpoint debería ser id_categoria
    const id_categoria = Number(req.params.id);

    const name = req.body?.name != null ? String(req.body.name).trim() : null;
    const active = req.body?.active;
    const productKind =
      req.body?.productKind != null ? String(req.body.productKind).trim() : null;

    const category = await Category.findOne({
      where: { id_categoria },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!category) {
      await t.rollback();
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    if (productKind != null && !isValidProductKind(productKind)) {
      await t.rollback();
      return res.status(400).json({ error: "Grupo del producto inválido" });
    }

    const productKindChanged =
      productKind != null && productKind !== category.productKind;

    if (name) category.name = name;
    if (typeof active === "boolean") category.active = active;
    if (productKind != null) category.productKind = productKind;

    await category.save({ transaction: t });

    let productsUpdated = 0;
    if (productKindChanged) {
      const [count] = await Product.update(cleanupPayloadForKind(productKind), {
        where: { categoryId: id_categoria },
        transaction: t,
      });
      productsUpdated = count;
    }

    await t.commit();
    res.json({
      ...category.toJSON(),
      productsUpdated,
    });
  } catch (err) {
    await t.rollback();
    console.error("updateCategory error:", err);
    res.status(500).json({ error: "Error actualizando categoría", details: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id_categoria = Number(req.params.id);

    const category = await Category.findOne({
      where: { id_categoria },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!category) {
      await t.rollback();
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    category.active = false;
    await category.save({ transaction: t });

    await t.commit();
    res.json({ message: "Categoría desactivada" });
  } catch (err) {
    await t.rollback();
    console.error("deleteCategory error:", err);
    res.status(500).json({ error: "Error desactivando categoría", details: err.message });
  }
};

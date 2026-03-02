import { Category } from "../models/index.js";

export const listCategories = async (req, res) => {
  const categories = await Category.findAll({ order: [["name", "ASC"]] });
  res.json(categories);
};

export const createCategory = async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (name.length < 2) return res.status(400).json({ error: "Nombre inválido" });

  const exists = await Category.findOne({ where: { name } });
  if (exists) return res.status(409).json({ error: "La categoría ya existe" });

  const category = await Category.create({ name });
  res.status(201).json(category);
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const name = req.body?.name != null ? String(req.body.name).trim() : null;
  const active = req.body?.active;

  const category = await Category.findByPk(id);
  if (!category) return res.status(404).json({ error: "Categoría no encontrada" });

  if (name) category.name = name;
  if (typeof active === "boolean") category.active = active;

  await category.save();
  res.json(category);
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);
  if (!category) return res.status(404).json({ error: "Categoría no encontrada" });

  category.active = false;
  await category.save();

  res.json({ message: "Categoría desactivada" });
};

import { Brand } from "../models/index.js";

export const listBrands = async (req, res) => {
  const brands = await Brand.findAll({ order: [["name", "ASC"]] });
  res.json(brands);
};

export const createBrand = async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (name.length < 2) return res.status(400).json({ error: "Nombre inválido" });

  const exists = await Brand.findOne({ where: { name } });
  if (exists) return res.status(409).json({ error: "La marca ya existe" });

  const brand = await Brand.create({ name });
  res.status(201).json(brand);
};

export const updateBrand = async (req, res) => {
  const { id } = req.params;
  const name = req.body?.name != null ? String(req.body.name).trim() : null;
  const active = req.body?.active;

  const brand = await Brand.findByPk(id);
  if (!brand) return res.status(404).json({ error: "Marca no encontrada" });

  if (name) brand.name = name;
  if (typeof active === "boolean") brand.active = active;

  await brand.save();
  res.json(brand);
};

export const deleteBrand = async (req, res) => {
  const { id } = req.params;

  const brand = await Brand.findByPk(id);
  if (!brand) return res.status(404).json({ error: "Marca no encontrada" });

  // recomendado: soft delete => active=false
  brand.active = false;
  await brand.save();

  res.json({ message: "Marca desactivada" });
};

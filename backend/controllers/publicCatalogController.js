import { Brand, Category, Product, ProductImage } from "../models/index.js";

const parseJsonArray = (raw) => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const listPublicCatalogProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { status: "Activo" },
      include: [
        { model: Brand, attributes: ["id_marca", "name"] },
        { model: Category, attributes: ["id_categoria", "name", "productKind"] },
        {
          model: ProductImage,
          as: "images",
          attributes: ["id", "url", "order"],
          where: { active: true },
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const out = products.map((p) => {
      const json = p.toJSON();
      const imgs = Array.isArray(json.images) ? json.images : [];
      imgs.sort((a, b) => Number(a.order) - Number(b.order));

      return {
        ...json,
        features: parseJsonArray(json.features),
        imageUrl: json.imageUrl || (imgs[0]?.url ?? null),
        images: imgs,
      };
    });

    return res.json(out);
  } catch (err) {
    console.error("listPublicCatalogProducts error:", err);
    return res.status(500).json({
      error: "Error listando productos del catálogo",
      details: err.message,
    });
  }
};

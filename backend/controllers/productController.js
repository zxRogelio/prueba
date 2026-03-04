import { sequelize } from "../config/sequelize.js";
import { Brand, Category, Product, ProductImage } from "../models/index.js";
import { validateProductPayload } from "../utils/productValidation.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import { getNextId } from "../utils/nextBusinessId.js";

const parseJsonArray = (raw) => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const listProducts = async (req, res) => {
  const products = await Product.findAll({
    include: [
      // ahora queremos exponer id_marca e id_categoria
      { model: Brand, attributes: ["id_marca", "name"] },
      { model: Category, attributes: ["id_categoria", "name"] },
      { model: ProductImage, as: "images", attributes: ["id", "url", "order"] },
    ],
    order: [["createdAt", "DESC"]],
  });

  const out = products.map((p) => {
    const json = p.toJSON();
    const imgs = Array.isArray(json.images) ? json.images : [];
    imgs.sort((a, b) => Number(a.order) - Number(b.order));
    return { ...json, images: imgs };
  });

  return res.json(out);
};

export const createProduct = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ok, errors } = validateProductPayload(req.body);
    if (!ok) {
      await t.rollback();
      return res.status(400).json({ error: "Validación", details: errors });
    }

    const brandId = Number(req.body.brandId);       // -> id_marca
    const categoryId = Number(req.body.categoryId); // -> id_categoria

    const brand = await Brand.findOne({
      where: { id_marca: brandId },
      transaction: t,
      lock: t.LOCK.KEY_SHARE,
    });
    if (!brand || !brand.active) {
      await t.rollback();
      return res.status(400).json({ error: "Marca inválida o inactiva" });
    }

    const category = await Category.findOne({
      where: { id_categoria: categoryId },
      transaction: t,
      lock: t.LOCK.KEY_SHARE,
    });
    if (!category || !category.active) {
      await t.rollback();
      return res.status(400).json({ error: "Categoría inválida o inactiva" });
    }

    const description = String(req.body?.description || "").trim() || null;
    const featuresArr = parseJsonArray(req.body?.features);
    const features = JSON.stringify(featuresArr);

    const files = Array.isArray(req.files) ? req.files : [];
    let imageUrl = req.body?.imageUrl || null;

    const uploadedImages = [];
    if (files.length) {
      for (const f of files) {
        if (!f?.buffer) continue;
        const uploaded = await uploadBufferToCloudinary(f.buffer);
        uploadedImages.push({ url: uploaded.secure_url, publicId: uploaded.public_id });
      }
      if (uploadedImages[0]) imageUrl = uploadedImages[0].url;
    }

    // ✅ autogenerar id_producto
    const id_producto = await getNextId(Product, "id_producto", t);

    const created = await Product.create(
      {
        id_producto,
        name: String(req.body.name).trim(),
        brandId,      // fk a id_marca
        categoryId,   // fk a id_categoria
        price: Number(req.body.price ?? 0),
        stock: Number(req.body.stock ?? 0),
        status: req.body.status || "Activo",
        imageUrl,
        productType: req.body.productType,
        description,
        features,

        supplementFlavor: req.body.supplementFlavor || null,
        supplementPresentation: req.body.supplementPresentation || null,
        supplementServings: req.body.supplementServings || null,

        apparelSize: req.body.apparelSize || null,
        apparelColor: req.body.apparelColor || null,
        apparelMaterial: req.body.apparelMaterial || null,
      },
      { transaction: t }
    );

    // ✅ galería: productId debe ser id_producto (NO el pk técnico)
    if (uploadedImages.length) {
      await ProductImage.bulkCreate(
        uploadedImages.map((img, idx) => ({
          productId: created.id_producto,
          url: img.url,
          publicId: img.publicId,
          order: idx,
        })),
        { transaction: t }
      );
    }

    await t.commit();

    // 🔎 traer completo por id_producto
    const full = await Product.findOne({
      where: { id_producto: created.id_producto },
      include: [
        { model: ProductImage, as: "images", attributes: ["id", "url", "order"], separate: true, order: [["order", "ASC"]] },
      ],
    });

    const json = full.toJSON();
    return res.status(201).json({
      ...json,
      features: parseJsonArray(json.features),
      imageUrl: json.imageUrl || (json.images?.[0]?.url ?? null),
    });
  } catch (err) {
    await t.rollback();
    console.error("createProduct error:", err);
    return res.status(500).json({ error: "Error creando producto", details: err.message });
  }
};

export const updateProduct = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id_producto = Number(req.params.id);

    const product = await Product.findOne({
      where: { id_producto },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    if (req.body.brandId) {
      const brand = await Brand.findOne({
        where: { id_marca: Number(req.body.brandId) },
        transaction: t,
        lock: t.LOCK.KEY_SHARE,
      });
      if (!brand || !brand.active) {
        await t.rollback();
        return res.status(400).json({ error: "Marca inválida o inactiva" });
      }
      req.body.brandId = Number(req.body.brandId);
    }

    if (req.body.categoryId) {
      const category = await Category.findOne({
        where: { id_categoria: Number(req.body.categoryId) },
        transaction: t,
        lock: t.LOCK.KEY_SHARE,
      });
      if (!category || !category.active) {
        await t.rollback();
        return res.status(400).json({ error: "Categoría inválida o inactiva" });
      }
      req.body.categoryId = Number(req.body.categoryId);
    }

    if (req.body.description != null) {
      req.body.description = String(req.body.description).trim() || null;
    }
    if (req.body.features != null) {
      req.body.features = JSON.stringify(parseJsonArray(req.body.features));
    }

    // imágenes nuevas
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length) {
      const count = await ProductImage.count({
        where: { productId: id_producto },
        transaction: t,
      });

      const uploadedImages = [];
      for (const f of files) {
        if (!f?.buffer) continue;
        const uploaded = await uploadBufferToCloudinary(f.buffer);
        uploadedImages.push({ url: uploaded.secure_url, publicId: uploaded.public_id });
      }

      if (uploadedImages.length) {
        await ProductImage.bulkCreate(
          uploadedImages.map((img, idx) => ({
            productId: id_producto,
            url: img.url,
            publicId: img.publicId,
            order: count + idx,
          })),
          { transaction: t }
        );

        if (!product.imageUrl) req.body.imageUrl = uploadedImages[0].url;
      }
    }

    await product.update(req.body, { transaction: t });
    await t.commit();

    const full = await Product.findOne({
      where: { id_producto },
      include: [{ model: ProductImage, as: "images", attributes: ["id", "url", "order"], separate: true, order: [["order", "ASC"]] }],
    });

    const json = full.toJSON();
    return res.json({
      ...json,
      features: parseJsonArray(json.features),
      imageUrl: json.imageUrl || (json.images?.[0]?.url ?? null),
    });
  } catch (err) {
    await t.rollback();
    console.error("updateProduct error:", err);
    return res.status(500).json({ error: "Error actualizando producto", details: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id_producto = Number(req.params.id);

    const product = await Product.findOne({
      where: { id_producto },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await product.update({ status: "Inactivo" }, { transaction: t });
    await t.commit();
    return res.json({ message: "Producto desactivado" });
  } catch (err) {
    await t.rollback();
    console.error("deleteProduct error:", err);
    return res.status(500).json({ error: "Error desactivando producto", details: err.message });
  }
};

export const deleteProductImage = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id_producto = Number(req.params.id);
    const imageId = Number(req.params.imageId);

    const product = await Product.findOne({
      where: { id_producto },
      transaction: t,
      lock: t.LOCK.KEY_SHARE,
    });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const img = await ProductImage.findOne({
      where: { id: imageId, productId: id_producto },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!img) {
      await t.rollback();
      return res.status(404).json({ error: "Imagen no encontrada" });
    }

    await img.destroy({ transaction: t });

    // Re-ordenar
    const rest = await ProductImage.findAll({
      where: { productId: id_producto },
      order: [["order", "ASC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    for (let i = 0; i < rest.length; i++) {
      if (rest[i].order !== i) {
        rest[i].order = i;
        await rest[i].save({ transaction: t });
      }
    }

    await t.commit();
    return res.json({ ok: true });
  } catch (err) {
    await t.rollback();
    console.error("deleteProductImage error:", err);
    return res.status(500).json({ error: "Error eliminando imagen", details: err.message });
  }
};

export const reorderProductImages = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id_producto = Number(req.params.id);

    const product = await Product.findOne({
      where: { id_producto },
      transaction: t,
      lock: t.LOCK.KEY_SHARE,
    });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const orderArr = req.body?.order;
    if (!Array.isArray(orderArr) || orderArr.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: "Orden inválido" });
    }

    const imgs = await ProductImage.findAll({
      where: { productId: id_producto },
      transaction: t,
    });

    const idsSet = new Set(imgs.map((x) => Number(x.id)));

    for (const imgId of orderArr) {
      if (!idsSet.has(Number(imgId))) {
        await t.rollback();
        return res.status(400).json({ error: "Orden contiene imágenes inválidas" });
      }
    }

    for (let i = 0; i < orderArr.length; i++) {
      await ProductImage.update(
        { order: i },
        { where: { id: Number(orderArr[i]), productId: id_producto }, transaction: t }
      );
    }

    await t.commit();

    const updated = await ProductImage.findAll({
      where: { productId: id_producto },
      order: [["order", "ASC"]],
    });

    return res.json(updated);
  } catch (err) {
    await t.rollback();
    console.error("reorderProductImages error:", err);
    return res.status(500).json({ error: "Error reordenando imágenes", details: err.message });
  }
};
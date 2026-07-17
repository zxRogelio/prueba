import { sequelize } from "../config/sequelize.js";
import { Brand, Category, Product, ProductImage } from "../models/index.js";
import { validateProductPayload } from "../utils/productValidation.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import { getNextId } from "../utils/nextBusinessId.js";
import {
  adjustProductStock,
  applyInventoryMovement,
} from "../services/inventoryService.js";
import { updateProductWithCentralizedPrice } from "../services/productPriceService.js";

const parseJsonArray = (raw) => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const productIncludes = [
  { model: Brand, attributes: ["id_marca", "name"] },
  { model: Category, attributes: ["id_categoria", "name"] },
  {
    model: ProductImage,
    as: "images",
    attributes: ["id", "url", "order"],
    where: { active: true },
    required: false,
  },
];

const normalizeProductFeatures = (raw) => {
  if (Array.isArray(raw)) {
    return raw.filter((item) => typeof item === "string");
  }

  return parseJsonArray(raw);
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const normalizeStockInput = (value) => {
  const normalized = Number(value ?? 0);

  if (!Number.isInteger(normalized) || normalized < 0) {
    const error = new Error("Stock invalido");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
};

const normalizePriceInput = (value) => {
  const normalized = Number(value ?? 0);

  if (!Number.isFinite(normalized) || normalized < 0) {
    const error = new Error("Precio invalido");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
};

const statusFromError = (error) => {
  const statusCode = Number(error.statusCode);
  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
    ? statusCode
    : 500;
};

const serializeProduct = (product) => {
  const json = product?.toJSON ? product.toJSON() : product;
  const images = Array.isArray(json.images) ? [...json.images] : [];

  images.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

  return {
    ...json,
    features: normalizeProductFeatures(json.features),
    images,
    imageUrl: json.imageUrl || (images[0]?.url ?? null),
    brandName: json.Brand?.name ?? null,
    categoryName: json.Category?.name ?? null,
  };
};

const fetchProducts = async ({ onlyActive = false } = {}) => {
  const where = onlyActive ? { status: "Activo" } : undefined;

  const products = await Product.findAll({
    ...(where ? { where } : {}),
    include: productIncludes,
    order: [["createdAt", "DESC"]],
  });

  return products.map(serializeProduct);
};

export const listProducts = async (req, res) => {
  try {
    const out = await fetchProducts();
    return res.json(out);
  } catch (err) {
    console.error("listProducts error:", err);
    return res.status(500).json({
      error: "Error listando productos",
      details: err.message,
    });
  }
};

export const listPublicProducts = async (req, res) => {
  try {
    const out = await fetchProducts({ onlyActive: true });
    return res.json(out);
  } catch (err) {
    console.error("listPublicProducts error:", err);
    return res.status(500).json({
      error: "Error listando productos",
      details: err.message,
    });
  }
};

export const getPublicProductById = async (req, res) => {
  try {
    const id_producto = Number(req.params.id);

    if (!Number.isInteger(id_producto)) {
      return res.status(400).json({ error: "Id de producto invalido" });
    }

    const product = await Product.findOne({
      where: { id_producto, status: "Activo" },
      include: productIncludes,
    });

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.json(serializeProduct(product));
  } catch (err) {
    console.error("getPublicProductById error:", err);
    return res.status(500).json({
      error: "Error obteniendo producto",
      details: err.message,
    });
  }
};

export const createProduct = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ok, errors } = validateProductPayload(req.body);
    if (!ok) {
      await t.rollback();
      return res.status(400).json({ error: "Validación", details: errors });
    }

    const brandId = Number(req.body.brandId);
    const categoryId = Number(req.body.categoryId);

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
        uploadedImages.push({
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
        });
      }
      if (uploadedImages[0]) imageUrl = uploadedImages[0].url;
    }

    const id_producto = await getNextId(Product, "id_producto", t);
    const initialStock = normalizeStockInput(req.body.stock);
    const initialPrice = normalizePriceInput(req.body.price);

    const created = await Product.create(
      {
        id_producto,
        name: String(req.body.name).trim(),
        brandId,
        categoryId,
        price: initialPrice,
        stock: 0,
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

    if (initialStock > 0) {
      await applyInventoryMovement({
        productId: created.id_producto,
        movementType: "restock",
        quantity: initialStock,
        reference: `product:create:${created.id_producto}`,
        createdBy: req.user?.id || null,
        notes: "Stock inicial registrado al crear producto",
        transaction: t,
      });
    }

    if (uploadedImages.length) {
      await ProductImage.bulkCreate(
        uploadedImages.map((img, idx) => ({
          productId: created.id_producto,
          url: img.url,
          publicId: img.publicId,
          order: idx,
          active: true,
        })),
        { transaction: t }
      );
    }

    await t.commit();

    const full = await Product.findOne({
      where: { id_producto: created.id_producto },
      include: [
        {
          model: ProductImage,
          as: "images",
          attributes: ["id", "url", "order"],
          where: { active: true },
          required: false,
          separate: true,
          order: [["order", "ASC"]],
        },
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
    return res.status(statusFromError(err)).json({
      error: "Error creando producto",
      details: err.message,
    });
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

    const updatePayload = { ...req.body };
    const stockProvided = hasOwn(updatePayload, "stock");
    const nextStock = stockProvided ? normalizeStockInput(updatePayload.stock) : null;
    const stockChangeReason =
      updatePayload.stockChangeReason ||
      updatePayload.stockReason ||
      updatePayload.reason ||
      null;
    const priceChangeReason =
      updatePayload.priceChangeReason ||
      updatePayload.priceReason ||
      updatePayload.reason ||
      null;

    if (hasOwn(updatePayload, "price")) {
      updatePayload.price = normalizePriceInput(updatePayload.price);
    }

    delete updatePayload.stock;
    delete updatePayload.stockChangeReason;
    delete updatePayload.stockReason;
    delete updatePayload.priceChangeReason;
    delete updatePayload.priceReason;
    delete updatePayload.reason;

    if (updatePayload.description != null) {
      updatePayload.description = String(updatePayload.description).trim() || null;
    }

    if (updatePayload.features != null) {
      updatePayload.features = JSON.stringify(parseJsonArray(updatePayload.features));
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length) {
      const count = await ProductImage.count({
        where: { productId: id_producto, active: true },
        transaction: t,
      });

      const uploadedImages = [];
      for (const f of files) {
        if (!f?.buffer) continue;
        const uploaded = await uploadBufferToCloudinary(f.buffer);
        uploadedImages.push({
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
        });
      }

      if (uploadedImages.length) {
        await ProductImage.bulkCreate(
          uploadedImages.map((img, idx) => ({
            productId: id_producto,
            url: img.url,
            publicId: img.publicId,
            order: count + idx,
            active: true,
          })),
          { transaction: t }
        );

        if (!product.imageUrl) updatePayload.imageUrl = uploadedImages[0].url;
      }
    }

    await updateProductWithCentralizedPrice({
      product,
      updates: updatePayload,
      changedBy: req.user?.id || null,
      reason: priceChangeReason,
      transaction: t,
    });

    if (stockProvided) {
      await adjustProductStock({
        productId: id_producto,
        newStock: nextStock,
        reference: `product:update:${id_producto}`,
        createdBy: req.user?.id || null,
        notes: stockChangeReason,
        transaction: t,
      });
    }

    await t.commit();

    const full = await Product.findOne({
      where: { id_producto },
      include: [
        {
          model: ProductImage,
          as: "images",
          attributes: ["id", "url", "order"],
          where: { active: true },
          required: false,
          separate: true,
          order: [["order", "ASC"]],
        },
      ],
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
    return res.status(statusFromError(err)).json({
      error: "Error actualizando producto",
      details: err.message,
    });
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
    return res.status(500).json({
      error: "Error desactivando producto",
      details: err.message,
    });
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
      where: { id: imageId, productId: id_producto, active: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!img) {
      await t.rollback();
      return res.status(404).json({ error: "Imagen no encontrada" });
    }

    await img.update({ active: false }, { transaction: t });

    const rest = await ProductImage.findAll({
      where: { productId: id_producto, active: true },
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
    return res.json({ ok: true, message: "Imagen desactivada correctamente" });
  } catch (err) {
    await t.rollback();
    console.error("deleteProductImage error:", err);
    return res.status(500).json({
      error: "Error desactivando imagen",
      details: err.message,
    });
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
      where: { productId: id_producto, active: true },
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
        {
          where: {
            id: Number(orderArr[i]),
            productId: id_producto,
            active: true,
          },
          transaction: t,
        }
      );
    }

    await t.commit();

    const updated = await ProductImage.findAll({
      where: { productId: id_producto, active: true },
      order: [["order", "ASC"]],
    });

    return res.json(updated);
  } catch (err) {
    await t.rollback();
    console.error("reorderProductImages error:", err);
    return res.status(500).json({
      error: "Error reordenando imágenes",
      details: err.message,
    });
  }
};

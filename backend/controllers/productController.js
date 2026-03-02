import { Brand, Category, Product, ProductImage } from "../models/index.js";
import { validateProductPayload } from "../utils/productValidation.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
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
      { model: Brand, attributes: ["id", "name"] },
      { model: Category, attributes: ["id", "name"] },
      { model: ProductImage, as: "images", attributes: ["id", "url", "order"] },
    ],
    order: [["createdAt", "DESC"]],
  });

  const out = products.map((p) => {
    const json = p.toJSON();

    // ordenar imágenes por "order"
    const imgs = Array.isArray(json.images) ? json.images : [];
    imgs.sort((a, b) => Number(a.order) - Number(b.order));

    return { ...json, images: imgs };
  });

  return res.json(out);
};



export const createProduct = async (req, res) => {
  // ✅ valida lo que ya tenías
  const { ok, errors } = validateProductPayload(req.body);
  if (!ok) return res.status(400).json({ error: "Validación", details: errors });

  // ✅ marca/categoría activas
  const brand = await Brand.findByPk(req.body.brandId);
  if (!brand || !brand.active) return res.status(400).json({ error: "Marca inválida o inactiva" });

  const category = await Category.findByPk(req.body.categoryId);
  if (!category || !category.active) return res.status(400).json({ error: "Categoría inválida o inactiva" });

  // ✅ NUEVO: description + features
  const description = String(req.body?.description || "").trim() || null;
  const featuresArr = parseJsonArray(req.body?.features);
  const features = JSON.stringify(featuresArr);

  // ✅ imágenes múltiples (multer array)
  const files = Array.isArray(req.files) ? req.files : [];

  // si mandas imageUrl manual, lo respetamos SOLO si no hay archivos
  let imageUrl = req.body?.imageUrl || null;

  // subimos todos los archivos
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

    // ✅ portada = primera
    if (uploadedImages[0]) imageUrl = uploadedImages[0].url;
  }

  const created = await Product.create({
    name: String(req.body.name).trim(),
    brandId: req.body.brandId,
    categoryId: req.body.categoryId,
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
  });

  // ✅ guardamos galería en tabla
  if (uploadedImages.length) {
    await ProductImage.bulkCreate(
      uploadedImages.map((img, idx) => ({
        productId: created.id,
        url: img.url,
        publicId: img.publicId,
        order: idx,
      }))
    );
  }

  const full = await Product.findByPk(created.id, {
    include: [
      { model: ProductImage, as: "images", attributes: ["id", "url", "order"], separate: true, order: [["order", "ASC"]] },
    ],
  });

  const json = full.toJSON();
  res.status(201).json({
    ...json,
    features: parseJsonArray(json.features),
    imageUrl: json.imageUrl || (json.images?.[0]?.url ?? null),
  });
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });

  // ✅ marca/categoría si cambian
  if (req.body.brandId) {
    const brand = await Brand.findByPk(req.body.brandId);
    if (!brand || !brand.active) return res.status(400).json({ error: "Marca inválida o inactiva" });
  }

  if (req.body.categoryId) {
    const category = await Category.findByPk(req.body.categoryId);
    if (!category || !category.active) return res.status(400).json({ error: "Categoría inválida o inactiva" });
  }

  // ✅ NUEVO: description + features (si vienen)
  if (req.body.description != null) {
    req.body.description = String(req.body.description).trim() || null;
  }
  if (req.body.features != null) {
    req.body.features = JSON.stringify(parseJsonArray(req.body.features));
  }

  // ✅ imágenes nuevas: las agregamos al final
  const files = Array.isArray(req.files) ? req.files : [];
  if (files.length) {
    const count = await ProductImage.count({ where: { productId: id } });

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
          productId: id,
          url: img.url,
          publicId: img.publicId,
          order: count + idx,
        }))
      );

      // ✅ si no hay portada, o si mandas "setCover=1" puedes cambiar portada
      if (!product.imageUrl) {
        req.body.imageUrl = uploadedImages[0].url;
      }
    }
  }

  await product.update(req.body);

  const full = await Product.findByPk(id, {
    include: [
      { model: ProductImage, as: "images", attributes: ["id", "url", "order"], separate: true, order: [["order", "ASC"]] },
    ],
  });

  const json = full.toJSON();
  res.json({
    ...json,
    features: parseJsonArray(json.features),
    imageUrl: json.imageUrl || (json.images?.[0]?.url ?? null),
  });
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });

  // ✅ soft delete
  await product.update({ status: "Inactivo" });
  res.json({ message: "Producto desactivado" });
};

export const deleteProductImage = async (req, res) => {
  const { id, imageId } = req.params;

  const product = await Product.findByPk(id);
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });

  const img = await ProductImage.findOne({ where: { id: imageId, productId: id } });
  if (!img) return res.status(404).json({ error: "Imagen no encontrada" });

  // Si guardas publicId, aquí puedes borrarla de Cloudinary:
  // await deleteFromCloudinary(img.publicId);

  await img.destroy();

  // Re-ordenar (opcional)
  const rest = await ProductImage.findAll({
    where: { productId: id },
    order: [["order", "ASC"]],
  });

  for (let i = 0; i < rest.length; i++) {
    if (rest[i].order !== i) {
      rest[i].order = i;
      await rest[i].save();
    }
  }

  return res.json({ ok: true });
};

export const reorderProductImages = async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });

  // body: { order: ["imgId1","imgId2",...] }
  const orderArr = req.body?.order;
  if (!Array.isArray(orderArr) || orderArr.length === 0) {
    return res.status(400).json({ error: "Orden inválido" });
  }

  // valida que todas pertenezcan al producto
  const imgs = await ProductImage.findAll({ where: { productId: id } });
  const idsSet = new Set(imgs.map((x) => x.id));

  for (const imgId of orderArr) {
    if (!idsSet.has(imgId)) {
      return res.status(400).json({ error: "Orden contiene imágenes inválidas" });
    }
  }

  // actualiza order
  for (let i = 0; i < orderArr.length; i++) {
    await ProductImage.update({ order: i }, { where: { id: orderArr[i], productId: id } });
  }

  const updated = await ProductImage.findAll({
    where: { productId: id },
    order: [["order", "ASC"]],
  });

  return res.json(updated);
};


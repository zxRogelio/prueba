import { Brand } from "./Brand.js";
import { Category } from "./Category.js";
import { Product } from "./Product.js";
import { ProductImage } from "./ProductImage.js";

// ✅ Category(id_categoria) <-> Brand(categoryId)
Category.hasMany(Brand, { foreignKey: "categoryId", sourceKey: "id_categoria" });
Brand.belongsTo(Category, { foreignKey: "categoryId", targetKey: "id_categoria" });

// ✅ Brand(id_marca) <-> Product(brandId)
Brand.hasMany(Product, { foreignKey: "brandId", sourceKey: "id_marca" });
Product.belongsTo(Brand, { foreignKey: "brandId", targetKey: "id_marca" });

// ✅ Category(id_categoria) <-> Product(categoryId)
Category.hasMany(Product, { foreignKey: "categoryId", sourceKey: "id_categoria" });
Product.belongsTo(Category, { foreignKey: "categoryId", targetKey: "id_categoria" });

// ✅ Product(id_producto) <-> ProductImage(productId)
Product.hasMany(ProductImage, {
  foreignKey: "productId",
  sourceKey: "id_producto",
  as: "images",
  onDelete: "CASCADE",
});
ProductImage.belongsTo(Product, { foreignKey: "productId", targetKey: "id_producto" });

export { Brand, Category, Product, ProductImage };
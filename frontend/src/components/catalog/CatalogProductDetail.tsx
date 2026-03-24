import { useEffect, useState } from "react";
import {
  FaCheck,
  FaHeart,
  FaMinus,
  FaPlus,
  FaRegHeart,
  FaShieldAlt,
  FaShoppingCart,
  FaStar,
  FaTruck,
  FaUndoAlt,
} from "react-icons/fa";
import styles from "./CatalogProductDetail.module.css";
import type { CatalogProductView } from "../../pages/visitor/catalogData";

const cx = (...names: Array<string | null | undefined | false>) =>
  names
    .flatMap((name) => (name ? name.split(" ") : []))
    .map((name) => styles[name])
    .filter(Boolean)
    .join(" ");

type DetailTab = "description" | "specifications" | "usage";

interface CatalogProductDetailProps {
  product: CatalogProductView;
  isFavorite: boolean;
  onToggleFavorite: (productId: CatalogProductView["id"]) => void;
  onAddToCart: (product: CatalogProductView, quantity?: number) => void;
}

function formatSpecLabel(key: string) {
  const normalized = key.replace(/_/g, " ").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function CatalogProductDetail({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
}: CatalogProductDetailProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<DetailTab>("description");

  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
    setActiveTab("description");
  }, [product.id]);

  const gallery = product.gallery?.length ? product.gallery : [product.image];
  const hasDiscount =
    typeof product.originalPrice === "number" &&
    product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.originalPrice! - product.price) / product.originalPrice!) * 100
      )
    : 0;

  return (
    <div className={cx("productDetail")}>
      <section className={cx("heroGrid")}>
        <div className={cx("mediaColumn")}>
          <div className={cx("mainImageWrap")}>
            {product.badge && <span className={cx("badge")}>{product.badge}</span>}

            <button
              type="button"
              className={cx("favorite", isFavorite && "favoriteActive")}
              onClick={() => onToggleFavorite(product.id)}
              aria-label={
                isFavorite
                  ? `Quitar ${product.name} de favoritos`
                  : `Agregar ${product.name} a favoritos`
              }
            >
              {isFavorite ? <FaHeart /> : <FaRegHeart />}
            </button>

            <img src={gallery[selectedImage]} alt={product.name} className={cx("mainImage")} />
          </div>

          {gallery.length > 1 && (
            <div className={cx("thumbs")}>
              {gallery.map((image, index) => (
                <button
                  key={`${product.id}-${index}`}
                  type="button"
                  className={cx("thumb", index === selectedImage && "thumbActive")}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`Ver imagen ${index + 1} de ${product.name}`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={cx("contentColumn")}>
          <div className={cx("metaRow")}>
            <span className={cx("category")}>{product.category}</span>
            <span className={cx("sku")}>SKU: {product.sku}</span>
          </div>

          <h1 className={cx("title")}>{product.name}</h1>

          <div className={cx("rating")}>
            <div className={cx("stars")}>
              {Array.from({ length: 5 }).map((_, index) => (
                <FaStar
                  key={`${product.id}-detail-star-${index}`}
                  className={cx(index < product.rating ? "starFilled" : "starEmpty")}
                />
              ))}
            </div>
            <span>({product.reviewCount} resenas)</span>
          </div>

          <div className={cx("priceRow")}>
            <strong className={cx("price")}>${product.price.toFixed(2)} MXN</strong>
            {hasDiscount && (
              <span className={cx("oldPrice")}>
                ${product.originalPrice!.toFixed(2)}
              </span>
            )}
            {hasDiscount && <span className={cx("discount")}>-{discountPercent}%</span>}
          </div>

          <p className={cx("description")}>{product.description}</p>

          <div className={cx("stock")}>
            <span className={cx("stockDot", !product.inStock && "stockDotOff")} />
            <span>{product.inStock ? "En stock" : "Agotado"}</span>
          </div>

          <div className={cx("actionRow")}>
            <div className={cx("quantityControl")}>
              <button
                type="button"
                className={cx("quantityButton")}
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                aria-label="Reducir cantidad"
              >
                <FaMinus />
              </button>
              <span className={cx("quantityValue")}>{quantity}</span>
              <button
                type="button"
                className={cx("quantityButton")}
                onClick={() => setQuantity((prev) => Math.min(10, prev + 1))}
                aria-label="Aumentar cantidad"
              >
                <FaPlus />
              </button>
            </div>

            <button
              type="button"
              className={cx("addButton")}
              disabled={!product.inStock}
              onClick={() => onAddToCart(product, quantity)}
            >
              <FaShoppingCart />
              {product.inStock ? "Agregar al carrito" : "Producto agotado"}
            </button>
          </div>

          <div className={cx("trustGrid")}>
            <article className={cx("trustCard")}>
              <span className={cx("trustIcon")}>
                <FaTruck />
              </span>
              <strong>Envio gratis</strong>
              <span>En compras +$500</span>
            </article>
            <article className={cx("trustCard")}>
              <span className={cx("trustIcon")}>
                <FaShieldAlt />
              </span>
              <strong>Pago seguro</strong>
              <span>100% protegido</span>
            </article>
            <article className={cx("trustCard")}>
              <span className={cx("trustIcon")}>
                <FaUndoAlt />
              </span>
              <strong>Devoluciones</strong>
              <span>30 dias</span>
            </article>
          </div>
        </div>
      </section>

      <section className={cx("detailTabsSection")}>
        <div className={cx("tabs")}>
          <button
            type="button"
            className={cx("tab", activeTab === "description" && "tabActive")}
            onClick={() => setActiveTab("description")}
          >
            Descripcion
          </button>
          <button
            type="button"
            className={cx("tab", activeTab === "specifications" && "tabActive")}
            onClick={() => setActiveTab("specifications")}
          >
            Especificaciones
          </button>
          <button
            type="button"
            className={cx("tab", activeTab === "usage" && "tabActive")}
            onClick={() => setActiveTab("usage")}
          >
            Modo de uso
          </button>
        </div>

        <div className={cx("panel")}>
          {activeTab === "description" && (
            <div className={cx("descriptionPanel")}>
              <p>{product.description}</p>
              <div className={cx("highlights")}>
                {product.features.map((feature) => (
                  <div key={feature} className={cx("highlight")}>
                    <FaCheck />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "specifications" && (
            <div className={cx("specsGrid")}>
              {Object.entries(product.specifications).map(([key, value]) => (
                <article key={key} className={cx("specCard")}>
                  <span className={cx("specIcon")}>
                    <FaCheck />
                  </span>
                  <div>
                    <strong>{formatSpecLabel(key)}</strong>
                    <span>{Array.isArray(value) ? value.join(", ") : value}</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeTab === "usage" && (
            <div className={cx("usagePanel")}>
              <p>{product.usage}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

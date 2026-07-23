import { useEffect, useState } from "react";
import {
  FaChevronRight,
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
import type { CartProduct } from "../../context/CartContext";

const cx = (...names: Array<string | null | undefined | false>) =>
  names
    .flatMap((name) => (name ? name.split(" ") : []))
    .map((name) => styles[name])
    .filter(Boolean)
    .join(" ");

interface CatalogProductDetailProps {
  product: CatalogProductView;
  recommendations: CatalogProductView[];
  isFavorite: boolean;
  onToggleFavorite: (productId: CatalogProductView["id"]) => void;
  onAddToCart: (product: CatalogProductView, quantity?: number) => void;
  onAddRecommendation: (product: CartProduct) => void;
}

function formatSpecLabel(key: string) {
  const normalized = key.replace(/_/g, " ").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function CatalogProductDetail({
  product,
  recommendations,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onAddRecommendation,
}: CatalogProductDetailProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
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
  const visibleRecommendations = recommendations.slice(0, 4);

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
            <strong className={cx("price")}>
              ${product.price.toFixed(2)}
              <span className={cx("currency")}>MXN</span>
            </strong>
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

      <section className={cx("detailInfoSection")}>
        <h2 className={cx("detailInfoTitle")}>Caracteristicas del producto</h2>

        <div className={cx("detailInfoGrid")}>
          <article className={cx("detailInfoColumn")}>
            <h3 className={cx("detailInfoHeading")}>Descripcion</h3>
            <div className={cx("detailInfoTable")}>
              <div className={cx("detailInfoRow", "detailInfoRowTall")}>
                <span>Resumen</span>
                <strong>{product.description}</strong>
              </div>
              {product.features.map((feature) => (
                <div key={feature} className={cx("detailInfoRow")}>
                  <span>Beneficio</span>
                  <strong>{feature}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className={cx("detailInfoColumn")}>
            <h3 className={cx("detailInfoHeading")}>Especificaciones</h3>
            <div className={cx("detailInfoTable")}>
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className={cx("detailInfoRow")}>
                  <span>{formatSpecLabel(key)}</span>
                  <strong>{Array.isArray(value) ? value.join(", ") : value}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className={cx("detailUsageCard")}>
          <h3 className={cx("detailInfoHeading")}>Modo de uso</h3>
          <p>{product.usage}</p>
        </article>
      </section>

      {visibleRecommendations.length > 0 && (
        <section
          className={cx("detailRecommendation")}
          aria-labelledby="detail-recommendation-title"
        >
          <div className={cx("detailRecommendationHeader")}>
            <h2 id="detail-recommendation-title">Tambien puede interesarte</h2>
          </div>

          <div className={cx("detailRecommendationList")}>
            {visibleRecommendations.map((recommendedProduct) => (
              <article
                key={recommendedProduct.id}
                className={cx("detailRecommendationCard")}
              >
                <img
                  src={recommendedProduct.image}
                  alt={recommendedProduct.name}
                  className={cx("detailRecommendationImage")}
                />

                <div className={cx("detailRecommendationBody")}>
                  <span>{recommendedProduct.category}</span>
                  <strong>{recommendedProduct.name}</strong>
                  <small>${recommendedProduct.price.toFixed(2)} MXN</small>
                </div>

                <button
                  type="button"
                  className={cx("detailRecommendationButton")}
                  onClick={() => onAddRecommendation(recommendedProduct)}
                  aria-label={`Agregar ${recommendedProduct.name}`}
                >
                  <FaChevronRight />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

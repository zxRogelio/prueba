import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaChevronRight, FaHome } from "react-icons/fa";
import CatalogProductDetail from "../../components/catalog/CatalogProductDetail";
import { useCart } from "../../context/useCart";
import {
  fetchCatalogProductById,
  fetchCatalogProductRecommendations,
  getCatalogProductPath,
  registerProductView,
  type CatalogProductView,
} from "./catalogData";
import styles from "./CatalogProductPage.module.css";
import { usePublicResource } from "../../hooks/usePublicResource";
import { SkeletonCards } from "../../components/pwa/Skeleton";
import { ResourceNotice } from "../../components/pwa/ResourceNotice";

const cx = (...names: Array<string | null | undefined | false>) =>
  names
    .flatMap((name) => (name ? name.split(" ") : []))
    .map((name) => styles[name])
    .filter(Boolean)
    .join(" ");

export default function CatalogProductPage() {
  const { productId } = useParams();
  const { addItem, openCart } = useCart();
  const loadProduct = useCallback((signal: AbortSignal) => fetchCatalogProductById(productId || "", signal), [productId]);
  const loadRecommendations = useCallback((signal: AbortSignal) => fetchCatalogProductRecommendations(productId || "", 4, signal), [productId]);
  const resource = usePublicResource(`product:${productId}`, loadProduct);
  const recommendationResource = usePublicResource(`recommendations:${productId}`, loadRecommendations);
  const product = resource.data;
  const recommendations = recommendationResource.data ?? [];
  const [favorites, setFavorites] = useState<Set<CatalogProductView["id"]>>(
    new Set()
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [productId]);

  useEffect(() => {
    if (product && resource.online && !resource.stale) void registerProductView(product.id);
  }, [product, resource.online, resource.stale]);

  const toggleFavorite = (productKey: CatalogProductView["id"]) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productKey)) {
        next.delete(productKey);
      } else {
        next.add(productKey);
      }
      return next;
    });
  };

  const addToCart = (selectedProduct: CatalogProductView, quantity = 1) => {
    if (!selectedProduct.inStock || !resource.online || resource.stale) return;

    for (let index = 0; index < quantity; index += 1) {
      addItem(selectedProduct);
    }

    openCart();
  };

  if (resource.loading) {
    return (
      <main className={cx("detailPage")}>
        <div className={cx("detailShell")}>
          <h1>Detalle del producto</h1>
          <ResourceNotice resource={resource} />
          <SkeletonCards count={1} variant="detail" waitingForConnection={resource.waitingForConnection} />
        </div>
      </main>
    );
  }

  if (resource.error && !product) {
    return (
      <main className={cx("detailPage")}>
        <div className={cx("detailShell")}>
          <section className={cx("detailNotFound")}>
            <h1 className={cx("detailNotFoundTitle")}>No pudimos cargar el producto</h1>
            <ResourceNotice resource={resource} />
            <SkeletonCards count={1} variant="detail" unavailable />
            <Link to="/catalogue" className={cx("detailBackButton")}>
              Volver al catalogo
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className={cx("detailPage")}>
        <div className={cx("detailShell")}>
          <section className={cx("detailNotFound")}>
            <h1 className={cx("detailNotFoundTitle")}>Producto no encontrado</h1>
            <p className={cx("detailNotFoundText")}>
              No pudimos encontrar el producto que estas buscando dentro del
              catalogo actual.
            </p>
            <Link to="/catalogue" className={cx("detailBackButton")}>
              Volver al catalogo
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={cx("detailPage")}>
      <div className={cx("detailShell")}>
        <nav className={cx("detailBreadcrumbs")} aria-label="Ruta de producto">
          <Link to="/" className={cx("detailBreadcrumbLink")}>
            <FaHome />
            <span>Inicio</span>
          </Link>
          <FaChevronRight className={cx("detailBreadcrumbIcon")} />
          <Link to="/catalogue" className={cx("detailBreadcrumbLink")}>
            Productos
          </Link>
          <FaChevronRight className={cx("detailBreadcrumbIcon")} />
          <span className={cx("detailBreadcrumbCategory")}>{product.category}</span>
          <FaChevronRight className={cx("detailBreadcrumbIcon")} />
          <span className={cx("detailBreadcrumbCurrent")}>{product.name}</span>
        </nav>

        <CatalogProductDetail
          disabled={!resource.online || resource.stale}
          recommendationsDisabled={!recommendationResource.online || recommendationResource.stale}
          product={product}
          recommendations={recommendations}
          isFavorite={favorites.has(product.id)}
          onToggleFavorite={toggleFavorite}
          onAddToCart={addToCart}
          onAddRecommendation={(recommendedProduct) => {
            if (!recommendationResource.online || recommendationResource.stale) return;
            addItem(recommendedProduct);
            openCart();
          }}
        />

        <ResourceNotice resource={resource} />
        <ResourceNotice resource={recommendationResource} />
        {recommendationResource.loading && <SkeletonCards count={3} waitingForConnection={recommendationResource.waitingForConnection} />}

        <section className={cx("detailFooterNav")}>
          <Link to="/catalogue" className={cx("detailBackButton")}>
            Volver al catalogo
          </Link>
          <Link to={getCatalogProductPath(product.id)} className={cx("detailCurrentLink")}>
            Compartir esta vista
          </Link>
        </section>
      </div>
    </main>
  );
}

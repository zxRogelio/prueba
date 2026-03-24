import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaChevronRight, FaHome } from "react-icons/fa";
import CatalogProductDetail from "../../components/catalog/CatalogProductDetail";
import { useCart } from "../../context/CartContext";
import {
  getCatalogProductById,
  getCatalogProductPath,
  type CatalogProductView,
} from "./catalogData";
import styles from "./CatalogProductPage.module.css";

const cx = (...names: Array<string | null | undefined | false>) =>
  names
    .flatMap((name) => (name ? name.split(" ") : []))
    .map((name) => styles[name])
    .filter(Boolean)
    .join(" ");

export default function CatalogProductPage() {
  const { productId } = useParams();
  const { addItem, openCart } = useCart();
  const [favorites, setFavorites] = useState<Set<CatalogProductView["id"]>>(
    new Set()
  );

  const product = productId ? getCatalogProductById(productId) : null;

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
    for (let index = 0; index < quantity; index += 1) {
      addItem(selectedProduct);
    }

    openCart();
  };

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
          product={product}
          isFavorite={favorites.has(product.id)}
          onToggleFavorite={toggleFavorite}
          onAddToCart={addToCart}
        />

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

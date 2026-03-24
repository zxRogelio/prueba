import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaHeart,
  FaHome,
  FaRegHeart,
  FaSearch,
  FaShoppingCart,
  FaStar,
  FaTimes,
} from "react-icons/fa";
import styles from "./CatalogePage.module.css";
import { useCart } from "../../context/CartContext";
import {
  type CatalogProductView,
  catalogCategories,
  catalogSortOptions,
  getAllCatalogProducts,
  getCatalogProductPath,
} from "./catalogData";

const cx = (...names: Array<string | null | undefined | false>) =>
  names
    .flatMap((name) => (name ? name.split(" ") : []))
    .map((name) => styles[name])
    .filter(Boolean)
    .join(" ");

export default function CatalogoPage() {
  const { addItem, openCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [sortBy, setSortBy] = useState("RECOMENDADO");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [favorites, setFavorites] = useState<Set<CatalogProductView["id"]>>(
    new Set()
  );
  const productsPerPage = 8;

  const filteredProducts = useMemo(() => {
    let filtered = getAllCatalogProducts();

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "TODOS") {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    switch (sortBy) {
      case "PRECIO: MENOR A MAYOR":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "PRECIO: MAYOR A MENOR":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "MAS POPULARES":
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case "MAS NUEVOS":
        filtered.reverse();
        break;
      default:
        filtered.sort((a, b) => Number(b.featured) - Number(a.featured));
        break;
    }

    return filtered;
  }, [searchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    setCurrentPageNumber(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const indexOfLastProduct = currentPageNumber * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const selectedContext =
    selectedCategory !== "TODOS"
      ? selectedCategory
      : searchQuery.trim()
        ? `Busqueda: ${searchQuery.trim()}`
        : "Todos los productos";

  const addToCart = (product: CatalogProductView) => {
    addItem(product);
    openCart();
  };

  const toggleFavorite = (productId: CatalogProductView["id"]) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  return (
    <main className={cx("catalogPage")}>
      <div className={cx("catalogShell")}>
        <section className={cx("catalogTopbar")}>
          <nav className={cx("catalogBreadcrumbs")} aria-label="Ruta de navegacion">
            <ol className={cx("catalogBreadcrumbList")}>
              <li className={cx("catalogBreadcrumbItem")}>
                <Link to="/" className={cx("catalogBreadcrumbLink")}>
                  <FaHome />
                  <span>Inicio</span>
                </Link>
              </li>
              <li className={cx("catalogBreadcrumbSeparator")} aria-hidden="true">
                /
              </li>
              <li className={cx("catalogBreadcrumbItem")}>
                <span className={cx("catalogBreadcrumbCurrent")}>Productos</span>
              </li>
            </ol>
          </nav>

          <div className={cx("catalogIntro")}>
            <div>
              <span className={cx("catalogKicker")}>Titanium Shop</span>
              <h1 className={cx("catalogTitle")}>Productos</h1>
              <p className={cx("catalogDescription")}>
                Seleccion premium de suplementos, ropa y accesorios con una
                presentacion mas limpia y enfocada en compra.
              </p>
            </div>

            <div className={cx("catalogStats")}>
              <div className={cx("catalogStat")}>
                <strong>{getAllCatalogProducts().length}</strong>
                <span>Productos</span>
              </div>
              <div className={cx("catalogStat")}>
                <strong>{catalogCategories.length - 1}</strong>
                <span>Categorias</span>
              </div>
            </div>
          </div>
        </section>

        <div className={cx("catalogLayout")}>
          <aside className={cx("catalogFiltersSidebar")}>
            <div className={cx("catalogFilterCard")}>
              <section className={cx("catalogFilterSection")}>
                <h2 className={cx("catalogFilterHeading")}>Buscar productos</h2>
                <div className={cx("catalogSearchField")}>
                  <FaSearch className={cx("catalogSearchIcon")} />
                  <input
                    type="text"
                    className={cx("catalogSearchInput")}
                    placeholder="Buscar por nombre o categoria"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    aria-label="Buscar productos"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={cx("catalogClearButton")}
                      onClick={() => setSearchQuery("")}
                      aria-label="Limpiar busqueda"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </section>

              <section className={cx("catalogFilterSection")}>
                <h2 className={cx("catalogFilterHeading")}>Filtrar por</h2>
                <div className={cx("catalogCategoryList")}>
                  {catalogCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={cx(
                        "catalogCategoryButton",
                        selectedCategory === category && "catalogCategoryButtonActive"
                      )}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </section>

              <section className={cx("catalogFilterSection")}>
                <h2 className={cx("catalogFilterHeading")}>Ordenar</h2>
                <div className={cx("catalogSortList")}>
                  {catalogSortOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={cx(
                        "catalogSortButton",
                        sortBy === option && "catalogSortButtonActive"
                      )}
                      onClick={() => setSortBy(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </aside>

          <section
            className={cx("catalogContent")}
            aria-labelledby="catalog-list-title"
          >
            <div className={cx("catalogResultsBar")}>
              <div>
                <h2 id="catalog-list-title" className={cx("catalogResultsCount")}>
                  Mostrando {filteredProducts.length} productos
                </h2>
                <p className={cx("catalogResultsContext")}>
                  Vista actual:
                  <span className={cx("catalogResultsBadge")}>{selectedContext}</span>
                </p>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className={cx("catalogEmptyState")}>
                <span className={cx("catalogEmptyIcon")}>
                  <FaSearch />
                </span>
                <h3 className={cx("catalogEmptyTitle")}>
                  No encontramos coincidencias
                </h3>
                <p className={cx("catalogEmptyText")}>
                  Ajusta tu busqueda o vuelve a mostrar todos los productos.
                </p>
                <button
                  type="button"
                  className={cx("catalogEmptyButton")}
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("TODOS");
                    setSortBy("RECOMENDADO");
                  }}
                >
                  Ver todo el catalogo
                </button>
              </div>
            ) : (
              <>
                <div className={cx("catalogProductsGrid")}>
                  {currentProducts.map((product) => {
                    const isFavorite = favorites.has(product.id);
                    const hasDiscount =
                      typeof product.originalPrice === "number" &&
                      product.originalPrice > product.price;

                    return (
                      <article key={product.id} className={cx("catalogProductCard")}>
                        <div className={cx("catalogProductMedia")}>
                          {product.badge && (
                            <span className={cx("catalogProductBadge")}>
                              {product.badge}
                            </span>
                          )}

                          <button
                            type="button"
                            className={cx(
                              "catalogProductFavorite",
                              isFavorite && "catalogProductFavoriteActive"
                            )}
                            onClick={() => toggleFavorite(product.id)}
                            aria-label={
                              isFavorite
                                ? `Quitar ${product.name} de favoritos`
                                : `Agregar ${product.name} a favoritos`
                            }
                          >
                            {isFavorite ? <FaHeart /> : <FaRegHeart />}
                          </button>

                          <img
                            src={product.image}
                            alt={product.name}
                            className={cx("catalogProductImage")}
                          />

                          <div className={cx("catalogProductOverlay")}>
                            <Link
                              to={getCatalogProductPath(product.id)}
                              className={cx("catalogQuickViewButton")}
                            >
                              Ver detalles
                            </Link>
                          </div>
                        </div>

                        <div className={cx("catalogProductBody")}>
                          <span className={cx("catalogProductCategory")}>
                            {product.category}
                          </span>

                          <h3 className={cx("catalogProductName")}>
                            {product.name}
                          </h3>

                          <div className={cx("catalogProductRating")}>
                            <div className={cx("catalogProductStars")}>
                              {Array.from({ length: 5 }).map((_, index) => (
                                <FaStar
                                  key={`${product.id}-card-star-${index}`}
                                  className={cx(
                                    index < product.rating
                                      ? "catalogProductStarFilled"
                                      : "catalogProductStarEmpty"
                                  )}
                                />
                              ))}
                            </div>
                            <span>({product.reviewCount})</span>
                          </div>

                          <div className={cx("catalogProductPriceRow")}>
                            <strong className={cx("catalogProductPrice")}>
                              ${product.price.toFixed(2)}
                            </strong>
                            {hasDiscount && (
                              <span className={cx("catalogProductOldPrice")}>
                                ${product.originalPrice!.toFixed(2)}
                              </span>
                            )}
                          </div>

                          <div className={cx("catalogProductActions")}>
                            <button
                              type="button"
                              className={cx("catalogAddToCartButton")}
                              onClick={() => addToCart(product)}
                            >
                              <FaShoppingCart />
                              Agregar al carrito
                            </button>
                            <Link
                              to={getCatalogProductPath(product.id)}
                              className={cx("catalogDetailsButton")}
                            >
                              Ver detalles
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <nav className={cx("catalogPagination")} aria-label="Paginacion">
                    <button
                      type="button"
                      className={cx(
                        "catalogPaginationArrow",
                        currentPageNumber === 1 && "catalogPaginationArrowDisabled"
                      )}
                      disabled={currentPageNumber === 1}
                      onClick={() =>
                        setCurrentPageNumber((prev) => Math.max(1, prev - 1))
                      }
                      aria-label="Pagina anterior"
                    >
                      <FaChevronLeft />
                    </button>

                    <div className={cx("catalogPaginationNumbers")}>
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                        (pageNumber) => (
                          <button
                            key={pageNumber}
                            type="button"
                            className={cx(
                              "catalogPaginationNumber",
                              currentPageNumber === pageNumber &&
                                "catalogPaginationNumberActive"
                            )}
                            onClick={() => setCurrentPageNumber(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className={cx(
                        "catalogPaginationArrow",
                        currentPageNumber === totalPages &&
                          "catalogPaginationArrowDisabled"
                      )}
                      disabled={currentPageNumber === totalPages}
                      onClick={() =>
                        setCurrentPageNumber((prev) => Math.min(totalPages, prev + 1))
                      }
                      aria-label="Pagina siguiente"
                    >
                      <FaChevronRight />
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

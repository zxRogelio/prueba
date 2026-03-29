import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaHeart,
  FaRegHeart,
  FaSearch,
  FaShoppingCart,
  FaStar,
  FaTimes,
} from "react-icons/fa";
import styles from "./CatalogePage.module.css";
import { useCart } from "../../context/CartContext";
import {
  buildCatalogCategories,
  type CatalogProductView,
  catalogSortOptions,
  fetchCatalogProducts,
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
  const [products, setProducts] = useState<CatalogProductView[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [sortBy, setSortBy] = useState("RECOMENDADO");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<CatalogProductView["id"]>>(
    new Set(),
  );
  const productsPerPage = 8;
  const catalogCategories = useMemo(
    () => buildCatalogCategories(products),
    [products],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });

    let ignore = false;

    const loadProducts = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const nextProducts = await fetchCatalogProducts();
        if (ignore) return;
        setProducts(nextProducts);
      } catch (error) {
        if (ignore) return;
        console.error("fetchCatalogProducts error:", error);
        setProducts([]);
        setLoadError("No pudimos cargar el catalogo desde el backend.");
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query),
      );
    }

    if (selectedCategory !== "TODOS") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory,
      );
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
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        );
        break;
      default:
        filtered.sort((a, b) => {
          if (Number(b.featured) !== Number(a.featured)) {
            return Number(b.featured) - Number(a.featured);
          }

          return (
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
          );
        });
        break;
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    if (catalogCategories.includes(selectedCategory)) return;
    setSelectedCategory("TODOS");
  }, [catalogCategories, selectedCategory]);

  useEffect(() => {
    setCurrentPageNumber(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const indexOfLastProduct = currentPageNumber * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const selectedContext =
    selectedCategory !== "TODOS"
      ? selectedCategory
      : searchQuery.trim()
        ? `Busqueda: ${searchQuery.trim()}`
        : "Todos los productos";

  const addToCart = (product: CatalogProductView) => {
    if (!product.inStock) return;
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
                <strong>{products.length}</strong>
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
                        selectedCategory === category &&
                          "catalogCategoryButtonActive",
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
                        sortBy === option && "catalogSortButtonActive",
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
                <h2
                  id="catalog-list-title"
                  className={cx("catalogResultsCount")}
                >
                  Mostrando {filteredProducts.length} productos
                </h2>
                <p className={cx("catalogResultsContext")}>
                  Vista actual:
                  <span className={cx("catalogResultsBadge")}>
                    {selectedContext}
                  </span>
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className={cx("catalogEmptyState")}>
                <span className={cx("catalogEmptyIcon")}>
                  <FaSearch />
                </span>
                <h3 className={cx("catalogEmptyTitle")}>Cargando productos</h3>
                <p className={cx("catalogEmptyText")}>
                  Estamos trayendo el catalogo desde la base de datos.
                </p>
              </div>
            ) : loadError ? (
              <div className={cx("catalogEmptyState")}>
                <span className={cx("catalogEmptyIcon")}>
                  <FaTimes />
                </span>
                <h3 className={cx("catalogEmptyTitle")}>
                  No pudimos cargar el catalogo
                </h3>
                <p className={cx("catalogEmptyText")}>{loadError}</p>
                <button
                  type="button"
                  className={cx("catalogEmptyButton")}
                  onClick={() => window.location.reload()}
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
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
                      <article
                        key={product.id}
                        className={cx("catalogProductCard")}
                      >
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
                              isFavorite && "catalogProductFavoriteActive",
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
                                      : "catalogProductStarEmpty",
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
                              disabled={!product.inStock}
                            >
                              <FaShoppingCart />
                              {product.inStock
                                ? "Agregar al carrito"
                                : "Sin stock"}
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
                  <nav
                    className={cx("catalogPagination")}
                    aria-label="Paginacion"
                  >
                    <button
                      type="button"
                      className={cx(
                        "catalogPaginationArrow",
                        currentPageNumber === 1 &&
                          "catalogPaginationArrowDisabled",
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
                      {Array.from(
                        { length: totalPages },
                        (_, index) => index + 1,
                      ).map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          className={cx(
                            "catalogPaginationNumber",
                            currentPageNumber === pageNumber &&
                              "catalogPaginationNumberActive",
                          )}
                          onClick={() => setCurrentPageNumber(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={cx(
                        "catalogPaginationArrow",
                        currentPageNumber === totalPages &&
                          "catalogPaginationArrowDisabled",
                      )}
                      disabled={currentPageNumber === totalPages}
                      onClick={() =>
                        setCurrentPageNumber((prev) =>
                          Math.min(totalPages, prev + 1),
                        )
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

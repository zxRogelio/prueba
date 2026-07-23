import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaBolt, FaPlus, FaShoppingCart, FaTimes } from "react-icons/fa";
import { useCart } from "../../context/useCart";
import {
  fetchCartProductRecommendations,
  type CatalogProductView,
} from "../../pages/visitor/catalogData";
import "./CartDrawer.css";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

export default function CartDrawer() {
  const {
    items,
    subtotal,
    isCartOpen,
    closeCart,
    addItem,
    updateQuantity,
    removeItem,
  } = useCart();
  const [recommendations, setRecommendations] = useState<CatalogProductView[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const itemIdsKey = useMemo(() => itemIds.map(String).sort().join("|"), [itemIds]);

  useEffect(() => {
    if (!isCartOpen) return;

    const originalOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeCart, isCartOpen]);

  useEffect(() => {
    if (!isCartOpen || itemIds.length === 0) {
      setRecommendations([]);
      setIsLoadingRecommendations(false);
      return;
    }

    let ignore = false;
    setIsLoadingRecommendations(true);

    fetchCartProductRecommendations(itemIds, 2)
      .then((nextRecommendations) => {
        if (ignore) return;

        const idsInCart = new Set(itemIds.map(String));
        setRecommendations(
          nextRecommendations.filter(
            (recommendation) => !idsInCart.has(String(recommendation.id)),
          ),
        );
      })
      .catch((error: unknown) => {
        if (ignore) return;
        console.warn("fetchCartProductRecommendations error:", error);
        setRecommendations([]);
      })
      .finally(() => {
        if (!ignore) setIsLoadingRecommendations(false);
      });

    return () => {
      ignore = true;
    };
  }, [isCartOpen, itemIdsKey]);

  if (!isCartOpen) return null;

  return (
    <div className="shared-cart-overlay" onClick={closeCart}>
      <aside
        className="shared-cart-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-cart-title"
      >
        <div className="shared-cart-header">
          <h3 id="shared-cart-title">Tu carrito</h3>
          <button
            type="button"
            className="shared-cart-close"
            onClick={closeCart}
            aria-label="Cerrar carrito"
          >
            <FaTimes />
          </button>
        </div>

        <div className="shared-cart-content">
          {items.length === 0 ? (
            <div className="shared-cart-empty">
              <FaShoppingCart />
              <p>Tu carrito esta vacio.</p>
            </div>
          ) : (
            <div className="shared-cart-items">
              {items.map((item) => (
                <article key={item.id} className="shared-cart-item">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="shared-cart-item-image"
                  />

                  <div className="shared-cart-item-body">
                    <h4>{item.name}</h4>
                    {item.category && (
                      <p className="shared-cart-item-category">{item.category}</p>
                    )}
                    <p className="shared-cart-item-price">
                      {formatMoney(Number(item.price))}
                    </p>

                    <div className="shared-cart-item-controls">
                      <div className="shared-cart-quantity">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label={`Reducir cantidad de ${item.name}`}
                        >
                          -
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={`Aumentar cantidad de ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="shared-cart-remove"
                        onClick={() => removeItem(item.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {(isLoadingRecommendations || recommendations.length > 0) && (
                <section
                  className="shared-cart-recommendations"
                  aria-labelledby="shared-cart-recommendations-title"
                >
                  <div className="shared-cart-recommendations-header">
                    <span className="shared-cart-recommendations-icon">
                      <FaBolt />
                    </span>
                    <div>
                      <h4 id="shared-cart-recommendations-title">
                        Recomendado para ti
                      </h4>
                      <p>Productos similares a los que agregaste.</p>
                    </div>
                  </div>

                  {isLoadingRecommendations ? (
                    <div className="shared-cart-recommendation-loading">
                      Buscando recomendaciones...
                    </div>
                  ) : (
                    <div className="shared-cart-recommendation-list">
                      {recommendations.map((recommendation) => (
                      <article
                        key={recommendation.id}
                        className="shared-cart-recommendation"
                      >
                        <img
                          src={recommendation.image}
                          alt={recommendation.name}
                          className="shared-cart-recommendation-image"
                        />

                        <div className="shared-cart-recommendation-body">
                          <span className="shared-cart-recommendation-rule">
                            {Math.round((recommendation.similarityScore ?? 0) * 100)}
                            % de coincidencia
                          </span>
                          <h5>{recommendation.name}</h5>
                        </div>

                        <div className="shared-cart-recommendation-action">
                          <strong>{formatMoney(Number(recommendation.price))}</strong>
                          <button
                            type="button"
                            onClick={() => addItem(recommendation)}
                            aria-label={`Agregar recomendacion ${recommendation.name}`}
                          >
                            <FaPlus />
                          </button>
                        </div>
                      </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        <div className="shared-cart-footer">
          <div className="shared-cart-total">
            <span>Total</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>

          {items.length > 0 ? (
            <Link
              to="/checkout"
              className="shared-cart-checkout"
              onClick={closeCart}
            >
              Proceder al pago
            </Link>
          ) : (
            <Link
              to="/catalogue"
              className="shared-cart-checkout"
              onClick={closeCart}
            >
              Ver catalogo
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FaShoppingCart, FaTimes } from "react-icons/fa";
import { useCart } from "../../context/CartContext";
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
    updateQuantity,
    removeItem,
  } = useCart();

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

import React, { useState, useEffect } from "react";
import "../styles/cataloge.css";
import Logo from "../assets/LogoP.png";
import { Link } from "react-router-dom";

// Datos de ejemplo para productos
const products = [
  {
    id: 1,
    name: "Proteína Whey Gold Standard",
    category: "PROTEÍNA",
    price: 899,
    image:
      "https://suplementosags.com/wp-content/uploads/2019/08/Comp-Gold-Standard-5Lbs-Marca-de-Agua.png",
    featured: true,
    description:
      "Proteína Whey de la más alta calidad con 24g de proteína por servicio. Ideal para ganancia muscular y recuperación post-entreno.",
    features: [
      "24g de proteína por servicio",
      "Bajo en lactosa",
      "Mezcla instantánea",
      "Sabor chocolate premium",
    ],
    specifications: {
      peso: "2.27 kg (5 lb)",
      sabores: ["Chocolate", "Vainilla", "Fresa"],
      servings: 74,
    },
  },
  {
    id: 2,
    name: "Creatina Monohidratada",
    category: "CREATINA",
    price: 599,
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkUQ1BTH2hPodXcQLiVcE2c_0DpFUKI-Np_w&s",
    featured: true,
    description:
      "Creatina monohidratada 100% pura. Aumenta tu fuerza y resistencia durante los entrenamientos de alta intensidad.",
    features: [
      "100% creatina monohidratada",
      "Aumenta fuerza y resistencia",
      "Mejora recuperación muscular",
      "Sin sabor, fácil de mezclar",
    ],
    specifications: {
      peso: "300 g",
      sabores: ["Natural"],
      servings: 100,
    },
  },
  {
    id: 3,
    name: "Pre-Entreno Explosive",
    category: "PRE-ENTRENO",
    price: 699,
    image:
      "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcT_z3Ucz0CPxiiaCFGcmKl4WfjtHIP2-JIz2mmvfOIzpaFbOCP6LFDsRR8U3yBNJDb2RQGypsENPiqKCeLw8afOa4RvYmzktsF38gokkV0xgisbK3nhriTI",
    featured: false,
    description:
      "Pre-entreno de máxima potencia con beta-alanina y cafeína. Energía sostenida sin crash.",
    features: [
      "Energía inmediata",
      "Enfoque mental mejorado",
      "Bombeo muscular intenso",
      "Sin crash posterior",
    ],
    specifications: {
      peso: "400 g",
      sabores: ["Frutos Rojos", "Tropical Punch", "Limonada"],
      servings: 40,
    },
  },
  {
    id: 4,
    name: "BCAA Amino Ácidos",
    category: "INTRA-ENTRENO",
    price: 499,
    image:
      "https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/opn/opn02036/l/48.jpg",
    featured: false,
    description:
      "BCAA 2:1:1 con electrolitos. Previene el catabolismo muscular durante entrenamientos intensos.",
    features: [
      "Ratio 2:1:1 comprobado",
      "Con electrolitos añadidos",
      "Recuperación acelerada",
      "Hidratación mejorada",
    ],
    specifications: {
      peso: "200 g",
      sabores: ["Limonada", "Sandía", "Uva"],
      servings: 50,
    },
  },
  {
    id: 5,
    name: "Tank Top Titanium",
    category: "ROPA",
    price: 349,
    image:
      "https://www.nutrimind.net/images/news/analisis_quemadores_grasa/1.png",
    featured: true,
    description:
      "Tank top de alta calidad con tecnología de secado rápido. Ideal para entrenamientos intensos.",
    features: [
      "Tecnología dry-fit",
      "Secado rápido",
      "Comodidad máxima",
      "Diseño ergonómico",
    ],
    specifications: {
      tallas: ["S", "M", "L", "XL", "XXL"],
      colores: ["Negro", "Rojo", "Gris", "Azul"],
      material: "Poliester 92%, Elastano 8%",
    },
  },
  {
    id: 6,
    name: "Shorts Deportivos",
    category: "ROPA",
    price: 299,
    image:
      "https://acide.com.mx/cdn/shop/files/ShortMexicocaballerofrente.png?v=1701984228&width=3840",
    featured: false,
    description:
      "Shorts deportivos con compresión ligera. Máxima libertad de movimiento.",
    features: [
      "Compresión ligera",
      "Bolsillo para llaves",
      "Cintura elástica",
      "Material transpirable",
    ],
    specifications: {
      tallas: ["S", "M", "L", "XL"],
      colores: ["Negro", "Gris", "Azul Marino"],
      material: "Poliester 88%, Elastano 12%",
    },
  },
  {
    id: 7,
    name: "Mass Gainer",
    category: "GANANCIA MÚSCULAR",
    price: 799,
    image:
      "https://bodyfitsupplements.com.mx/cdn/shop/files/PROTEINASBODY_30.png?v=1733072937",
    featured: true,
    description:
      "Ganador de peso con 50g de proteína y carbohidratos complejos. Ideal para volumen limpio.",
    features: [
      "50g de proteína por servicio",
      "Carbohidratos complejos",
      "Enzimas digestivas",
      "Bajo en azúcar",
    ],
    specifications: {
      peso: "5.45 kg (12 lb)",
      sabores: ["Vainilla", "Chocolate", "Cookies & Cream"],
      servings: 20,
    },
  },
  {
    id: 8,
    name: "Quemador de Grasa",
    category: "CONTROL DE PESO",
    price: 649,
    image:
      "https://www.nutrimind.net/images/news/analisis_quemadores_grasa/1.png",
    featured: false,
    description:
      "Termogénico avanzado con ingredientes naturales. Acelera el metabolismo y suprime el apetito.",
    features: [
      "Termogénesis avanzada",
      "Supresor del apetito",
      "Energía natural",
      "Ingredientes naturales",
    ],
    specifications: {
      peso: "180 cápsulas",
      dosis: "2 cápsulas al día",
      duracion: "90 días",
    },
  },
  {
    id: 9,
    name: "Multivitamínico Premium",
    category: "SALUD • BIENESTAR",
    price: 399,
    image:
      "https://www.nutrimind.net/images/news/analisis_quemadores_grasa/1.png",
    featured: true,
    description:
      "Multivitamínico completo con minerales esenciales. Soporte nutricional para atletas.",
    features: [
      "30+ vitaminas y minerales",
      "Alta biodisponibilidad",
      "Formulación para atletas",
      "Libre de OGM",
    ],
    specifications: {
      peso: "120 tabletas",
      dosis: "1 tableta al día",
      duracion: "4 meses",
    },
  },
  {
    id: 10,
    name: "Hoodie Titanium",
    category: "ROPA",
    price: 599,
    image:
      "https://www.nutrimind.net/images/news/analisis_quemadores_grasa/1.png",
    featured: false,
    description:
      "Hoodie premium con capucha y bolsillo canguro. Perfecto para entrenar en climas fríos.",
    features: [
      "Tela French Terry",
      "Bolsillo canguro",
      "Corte moderno",
      "Capucha ajustable",
    ],
    specifications: {
      tallas: ["S", "M", "L", "XL", "XXL"],
      colores: ["Negro", "Gris Oscuro", "Rojo Titanium"],
      material: "Algodón 80%, Poliester 20%",
    },
  },
  {
    id: 11,
    name: "Glutamina Recovery",
    category: "RECUPERACIÓN",
    price: 449,
    image: "https://via.placeholder.com/300x300/ef4444/ffffff?text=GLUTAMINA",
    featured: false,
    description:
      "Glutamina pura para recuperación muscular y salud intestinal. Reduce el dolor muscular.",
    features: [
      "Recuperación acelerada",
      "Salud intestinal",
      "Sistema inmune",
      "Sin sabor añadido",
    ],
    specifications: {
      peso: "300 g",
      sabores: ["Natural"],
      servings: 60,
    },
  },
  {
    id: 12,
    name: "Proteína Vegana",
    category: "PROTEÍNA",
    price: 749,
    image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=VEGANA",
    featured: true,
    description:
      "Proteína vegetal de guisante y arroz. Alternativa vegana de alta calidad nutricional.",
    features: [
      "Proteína completa vegana",
      "Fácil digestión",
      "Sin lácteos ni soya",
      "Aminoácidos esenciales",
    ],
    specifications: {
      peso: "1.8 kg (4 lb)",
      sabores: ["Vainilla Natural", "Chocolate"],
      servings: 45,
    },
  },
];

const categories = [
  "TODOS",
  "PRE-ENTRENO",
  "INTRA-ENTRENO",
  "GANANCIA MÚSCULAR",
  "PROTEÍNA",
  "CREATINA",
  "CONTROL DE PESO",
  "SALUD • BIENESTAR",
  "ROPA",
  "RECUPERACIÓN",
];

const sortOptions = [
  "RECOMENDADO",
  "PRECIO: MENOR A MAYOR",
  "PRECIO: MAYOR A MENOR",
  "MÁS POPULARES",
  "MÁS NUEVOS",
];

// Componente del Carrito
function Cart({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem }) {
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (!isOpen) return null;

  return (
    <div
      className="cart-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
    >
      <div className="cart-sidebar">
        <div className="cart-header">
          <h3 id="cart-title">TU CARRITO</h3>
          <button
            onClick={onClose}
            className="cart-close-btn"
            aria-label="Cerrar carrito"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="cart-content">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="cart-item-image"
                    />
                    <div className="cart-item-details">
                      <h4>{item.name}</h4>
                      <p className="cart-item-category">{item.category}</p>
                      <p className="cart-item-price">${item.price}.00 MXN</p>
                    </div>
                    <div className="cart-item-controls">
                      <div className="quantity-controls">
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity - 1)
                          }
                          aria-label={`Reducir cantidad de ${item.name}`}
                        >
                          -
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity + 1)
                          }
                          aria-label={`Aumentar cantidad de ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="remove-item-btn"
                        aria-label={`Eliminar ${item.name} del carrito`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-footer">
                <div className="cart-total">
                  <span>Total:</span>
                  <span>${total}.00 MXN</span>
                </div>
                <Link to="/checkout" className="checkout-btn">
                  PROCEDER AL PAGO
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de Detalles del Producto
function ProductDetail({ isOpen, onClose, product, onAddToCart }) {
  if (!isOpen || !product) return null;

  return (
    <div
      className="product-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <div className="product-detail-sidebar">
        <div className="product-detail-header">
          <h3 id="product-detail-title">DETALLES DEL PRODUCTO</h3>
          <button
            onClick={onClose}
            className="product-detail-close-btn"
            aria-label="Cerrar detalles del producto"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="product-detail-content">
          <div className="product-detail-image-container">
            <img
              src={product.image}
              alt={product.name}
              className="product-detail-image"
            />
            {product.featured && (
              <div className="product-detail-badge">POPULAR</div>
            )}
          </div>

          <div className="product-detail-info">
            <div className="product-detail-category">{product.category}</div>
            <h2 className="product-detail-name">{product.name}</h2>
            <div className="product-detail-price">${product.price}.00 MXN</div>

            <p className="product-detail-description">{product.description}</p>

            <div className="product-detail-features">
              <h4>CARACTERÍSTICAS PRINCIPALES</h4>
              <ul>
                {product.features.map((feature, index) => (
                  <li key={index}>
                    <svg
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="product-detail-specifications">
              <h4>ESPECIFICACIONES</h4>
              <div className="specs-grid">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="spec-item">
                    <span className="spec-label">
                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                    </span>
                    <span className="spec-value">
                      {Array.isArray(value) ? value.join(", ") : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="product-detail-actions">
              <button
                className="add-to-cart-detail-btn"
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                aria-label={`Agregar ${product.name} al carrito`}
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                AGREGAR AL CARRITO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente principal del catálogo
export default function CatalogoPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [sortBy, setSortBy] = useState("RECOMENDADO");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const productsPerPage = 8;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Filtrar productos cuando cambia la categoría, búsqueda o el orden
  useEffect(() => {
    let filtered = products;

    // Filtrar por búsqueda
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
      );
    }

    // Filtrar por categoría
    if (selectedCategory !== "TODOS") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    // Ordenar productos
    switch (sortBy) {
      case "PRECIO: MENOR A MAYOR":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "PRECIO: MAYOR A MENOR":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "MÁS POPULARES":
        filtered.sort((a, b) =>
          b.featured === a.featured ? 0 : b.featured ? 1 : -1
        );
        break;
      case "MÁS NUEVOS":
        filtered.reverse();
        break;
      default:
        // RECOMENDADO - mantener orden original
        break;
    }

    setFilteredProducts(filtered);
    setCurrentPageNumber(1);
  }, [selectedCategory, sortBy, searchQuery]);

  // Funciones del carrito
  const addToCart = (product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
  };

  // Funciones para detalles del producto
  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setIsProductDetailOpen(true);
  };

  const closeProductDetail = () => {
    setIsProductDetailOpen(false);
    setSelectedProduct(null);
  };

  // Paginación
  const indexOfLastProduct = currentPageNumber * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const paginate = (pageNumber) => setCurrentPageNumber(pageNumber);

  return (
    <div className="page-container">
      {/* Animated background elements */}
      <div className="bg-animation" aria-hidden="true">
        <div className="bg-grid" />
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
      </div>

      {/* Header */}
      <header className={`header ${scrolled ? "header-scrolled" : ""}`}>
        <div className="header-content">
          <div className="logo-container">
            <Link to="/" aria-label="Ir al inicio de Titanium Sport Gym">
              <img src={Logo} alt="Titanium Sport Gym" className="logo-image" />
            </Link>
          </div>

          <nav className="nav-desktop" aria-label="Navegación principal">
            <div className="nav-main-links">
              <Link to="/" className="nav-link">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                INICIO
                <span className="nav-underline" />
              </Link>
              <Link to="/catalogue" className="nav-link" aria-current="page">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                PRODUCTOS
                <span className="nav-underline" />
              </Link>

              <Link to="/suscripciones" className="nav-link">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                SUSCRIPCIONES
                <span className="nav-underline" />
              </Link>

              <Link to="/acerca-de" className="nav-link">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                ACERCA DE NOSOTROS
                <span className="nav-underline" />
              </Link>
            </div>

            <div className="nav-action-links">
              <div className="nav-divider" aria-hidden="true" />
              <button
                className="cart-icon-btn"
                onClick={() => setIsCartOpen(true)}
                aria-label={`Abrir carrito de compras. ${
                  cartItems.length > 0
                    ? `${cartItems.reduce(
                        (total, item) => total + item.quantity,
                        0
                      )} items en el carrito`
                    : "Carrito vacío"
                }`}
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {cartItems.length > 0 && (
                  <span className="cart-badge" aria-hidden="true">
                    {cartItems.reduce(
                      (total, item) => total + item.quantity,
                      0
                    )}
                  </span>
                )}
              </button>
              <Link to="/register" className="slider-btn-outline">
                SUSCRIBETE
              </Link>
              <Link to="/login" className="slider-btn-solid">
                INICIA SESIÓN
              </Link>
            </div>
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-label={
              mobileMenuOpen
                ? "Cerrar menú de navegación"
                : "Abrir menú de navegación"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu" id="mobile-menu" role="menu">
            <nav className="mobile-nav" aria-label="Navegación móvil">
              <Link to="/" className="mobile-nav-link" role="menuitem">
                INICIO
              </Link>
              <Link
                to="/catalogue"
                className="mobile-nav-link active"
                role="menuitem"
                aria-current="page"
              >
                PRODUCTOS
              </Link>
              <Link
                to="/suscripciones"
                className="mobile-nav-link"
                role="menuitem"
              >
                SUSCRIPCIONES
              </Link>
              <Link to="/acerca-de" className="mobile-nav-link" role="menuitem">
                ACERCA DE
              </Link>
              <div className="mobile-nav-buttons">
                <Link to="/register" className="slider-btn-outline">
                  SUSCRÍBETE
                </Link>
                <Link to="/login" className="slider-btn-solid">
                  INICIA SESIÓN
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Ruta de navegación">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <Link to="/" className="breadcrumb-link">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span className="sr-only">Ir a</span> INICIO
            </Link>
          </li>
          <li className="breadcrumb-separator" aria-hidden="true">
            /
          </li>
          <li className="breadcrumb-item">
            <span className="breadcrumb-current">PRODUCTOS</span>
          </li>
        </ol>
      </nav>

      {/* Hero Section del Catálogo */}
      <section className="catalog-hero" aria-labelledby="catalog-title">
        <div className="catalog-hero-content">
          <h1 id="catalog-title" className="catalog-title brush-text">
            TIENDA TITANIUM
          </h1>
          <p className="catalog-subtitle">
            Descubre nuestra selección premium de suplementos deportivos y ropa
            de entrenamiento diseñada para maximizar tu rendimiento y estilo
          </p>
        </div>
      </section>

      {/* Layout principal con filtros a la izquierda */}
      <main className="catalog-layout">
        
        {/* Columna izquierda - Filtros y Búsqueda */}
        <aside className="catalog-filters-sidebar">
          <div className="filters-sidebar-container">
            
            {/* Búsqueda */}
            <div className="search-filter-section">
              <h3 className="filter-section-title">BUSCAR PRODUCTOS</h3>
              <div className="search-input-container">
                <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  className="search-filter-input"
                  placeholder="Buscar por nombre, categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Buscar productos"
                />
                {searchQuery && (
                  <button 
                    className="clear-search-btn" 
                    onClick={() => setSearchQuery("")}
                    aria-label="Limpiar búsqueda"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="search-results-info">
                  {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Filtros por categoría */}
            <div className="filter-section">
              <h3 className="filter-section-title">FILTRAR POR</h3>
              <div className="category-filters-list">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`category-filter-btn ${
                      selectedCategory === category ? "category-filter-btn-active" : ""
                    }`}
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={selectedCategory === category}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Ordenamiento */}
            <div className="filter-section">
              <h3 className="filter-section-title">ORDENAR POR</h3>
              <div className="sort-filters-list">
                {sortOptions.map((option) => (
                  <button
                    key={option}
                    className={`sort-filter-btn ${
                      sortBy === option ? "sort-filter-btn-active" : ""
                    }`}
                    onClick={() => setSortBy(option)}
                    aria-pressed={sortBy === option}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* Columna derecha - Productos */}
        <section className="catalog-products-section">
          
          {/* Grid de Productos */}
          <div className="products-container">
            <h2 id="products-title" className="sr-only">
              Productos disponibles
            </h2>
            <div className="products-grid">
              {currentProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="product-image-container">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-image"
                    />

                    <button
                      className="product-wishlist"
                      aria-label={`Agregar ${product.name} a favoritos`}
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <div className="product-category">{product.category}</div>
                    <div className="product-price">${product.price}.00 MXN</div>

                    <div className="product-actions">
                      <button
                        className="add-to-cart-btn"
                        onClick={() => addToCart(product)}
                        aria-label={`Agregar ${product.name} al carrito`}
                      >
                        <svg
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        AGREGAR AL CARRITO
                      </button>
                      <button
                        className="view-details-btn"
                        onClick={() => openProductDetail(product)}
                        aria-label={`Ver detalles de ${product.name}`}
                      >
                        VER DETALLES
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Paginación - Solo círculos */}
            {totalPages > 1 && (
              <nav
                className="pagination-simple"
                aria-label="Paginación de productos"
              >
                <div className="pagination-circles">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`pagination-circle ${
                          currentPageNumber === number
                            ? "pagination-circle-active"
                            : ""
                        }`}
                        aria-label={`Ir a la página ${number}`}
                        aria-current={
                          currentPageNumber === number ? "page" : undefined
                        }
                      >
                        {number}
                      </button>
                    )
                  )}
                </div>
              </nav>
            )}
          </div>
        </section>

      </main>

     

      {/* Componente del Carrito */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
      />

      {/* Componente de Detalles del Producto */}
      <ProductDetail
        isOpen={isProductDetailOpen}
        onClose={closeProductDetail}
        product={selectedProduct}
        onAddToCart={addToCart}
      />
    </div>
  );
}
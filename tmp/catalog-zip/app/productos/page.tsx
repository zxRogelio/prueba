'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, ShoppingCart, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/titanium/header';
import { Footer } from '@/components/titanium/footer';
import { getProducts, productCategories } from '@/lib/api';
import type { Product, ProductCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRODUCTS_PER_PAGE = 8;

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load products
  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      const data = await getProducts();
      setProducts(data);
      setFilteredProducts(data);
      setIsLoading(false);
    }
    loadProducts();
  }, []);

  // Filter products
  useEffect(() => {
    let result = products;

    // Filter by category
    if (selectedCategory !== 'todos') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.categoryLabel.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, products]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });
  };

  const handleAddToCart = (product: Product) => {
    // TODO: Implement cart functionality with backend
    console.log('Add to cart:', product.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Spacer for fixed header */}
      <div className="h-20" />

      {/* Hero Banner */}
      <section className="relative bg-[#212121] py-16 md:py-24 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center animate-fade-in-up">
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              TIENDA <span className="text-[#E53935]">TITANIUM</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              Descubre nuestra seleccion premium de suplementos deportivos y ropa de 
              entrenamiento disenada para maximizar tu rendimiento y estilo
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar Filters */}
            <aside className="lg:w-72 shrink-0">
              <div className="lg:sticky lg:top-28 space-y-6">
                {/* Search */}
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-fade-in-up">
                  <h3 className="font-heading font-bold text-lg mb-4">BUSCAR PRODUCTOS</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar por nombre, categoria..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-fade-in-up animation-delay-100">
                  <h3 className="font-heading font-bold text-lg mb-4">FILTRAR POR</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {productCategories.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value as ProductCategory)}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-300',
                          selectedCategory === cat.value
                            ? 'bg-[#E53935] text-white shadow-lg shadow-[#E53935]/20'
                            : 'bg-muted/50 text-foreground hover:bg-muted'
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Results count */}
              <div className="flex items-center justify-between mb-6 animate-fade-in">
                <p className="text-muted-foreground">
                  Mostrando <span className="font-semibold text-foreground">{filteredProducts.length}</span> productos
                </p>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-muted animate-pulse rounded-xl h-[400px]" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedProducts.map((product, index) => (
                      <Card 
                        key={product.id}
                        className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-500 animate-fade-in-up bg-card"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Product Image */}
                        <div className="relative aspect-square bg-muted/30 overflow-hidden">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          
                          {/* Favorite Button */}
                          <button
                            onClick={() => toggleFavorite(product.id)}
                            className={cn(
                              'absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10',
                              favorites.has(product.id)
                                ? 'bg-[#E53935] text-white'
                                : 'bg-white/90 text-gray-600 hover:bg-white hover:text-[#E53935]'
                            )}
                          >
                            <Heart className={cn('h-5 w-5', favorites.has(product.id) && 'fill-current')} />
                          </button>

                          {/* Sale Badge */}
                          {product.isOnSale && (
                            <Badge className="absolute top-3 left-3 bg-[#E53935] text-white border-0 animate-pulse">
                              OFERTA
                            </Badge>
                          )}

                          {/* Quick overlay on hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Link href={`/productos/${product.id}`}>
                              <Button 
                                variant="outline" 
                                className="bg-white text-[#212121] border-0 hover:bg-[#E53935] hover:text-white transition-all duration-300 transform translate-y-4 group-hover:translate-y-0"
                              >
                                Vista rapida
                              </Button>
                            </Link>
                          </div>
                        </div>

                        <CardContent className="p-4">
                          {/* Product Info */}
                          <div className="mb-3">
                            <p className="text-[#E53935] text-xs font-semibold tracking-wider mb-1">
                              {product.categoryLabel}
                            </p>
                            <h3 className="font-heading font-bold text-lg line-clamp-2 group-hover:text-[#E53935] transition-colors">
                              {product.name}
                            </h3>
                          </div>

                          {/* Rating */}
                          <div className="flex items-center gap-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={cn(
                                  'h-4 w-4',
                                  i < product.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                )} 
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({product.reviewCount})
                            </span>
                          </div>

                          {/* Price */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className="font-heading text-xl font-bold text-foreground">
                              ${product.price.toFixed(2)} {product.currency}
                            </span>
                            {product.originalPrice && (
                              <span className="text-sm text-muted-foreground line-through">
                                ${product.originalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="space-y-2">
                            <Button 
                              onClick={() => handleAddToCart(product)}
                              className="w-full bg-[#E53935] hover:bg-[#C62828] text-white font-heading font-semibold gap-2 transition-all duration-300 hover:shadow-lg hover:shadow-[#E53935]/20"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              AGREGAR AL CARRITO
                            </Button>
                            <Link href={`/productos/${product.id}`} className="block">
                              <Button 
                                variant="outline" 
                                className="w-full border-[#E53935] text-[#E53935] hover:bg-[#E53935] hover:text-white font-heading font-semibold transition-all duration-300"
                              >
                                VER DETALLES
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Empty State */}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-16 animate-fade-in">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                        <Search className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="font-heading text-2xl font-bold mb-2">No se encontraron productos</h3>
                      <p className="text-muted-foreground mb-6">Intenta con otros filtros o terminos de busqueda</p>
                      <Button 
                        onClick={() => {
                          setSelectedCategory('todos');
                          setSearchQuery('');
                        }}
                        className="bg-[#E53935] hover:bg-[#C62828]"
                      >
                        Ver todos los productos
                      </Button>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-12 animate-fade-in-up">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="border-border"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {[...Array(totalPages)].map((_, i) => (
                        <Button
                          key={i}
                          variant={currentPage === i + 1 ? 'default' : 'outline'}
                          onClick={() => setCurrentPage(i + 1)}
                          className={cn(
                            'w-10 h-10 font-heading',
                            currentPage === i + 1 
                              ? 'bg-[#E53935] hover:bg-[#C62828]' 
                              : 'border-border hover:border-[#E53935] hover:text-[#E53935]'
                          )}
                        >
                          {i + 1}
                        </Button>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="border-border"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

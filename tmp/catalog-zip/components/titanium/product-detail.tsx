'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ChevronRight, 
  Home, 
  Star, 
  Heart, 
  ShoppingCart, 
  Minus, 
  Plus,
  Truck,
  Shield,
  RotateCcw,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const images = product.images || [product.imageUrl];

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    // TODO: Implement cart functionality with backend
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsAddingToCart(false);
  };

  const incrementQuantity = () => setQuantity(q => Math.min(q + 1, 10));
  const decrementQuantity = () => setQuantity(q => Math.max(q - 1, 1));

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm mb-8 animate-fade-in">
          <Link 
            href="/" 
            className="flex items-center gap-1 text-muted-foreground hover:text-[#E53935] transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Inicio</span>
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Link 
            href="/productos" 
            className="text-muted-foreground hover:text-[#E53935] transition-colors"
          >
            Productos
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Link 
            href={`/productos?category=${product.category}`}
            className="text-muted-foreground hover:text-[#E53935] transition-colors"
          >
            {product.categoryLabel}
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4 animate-fade-in-up">
            {/* Main Image */}
            <div className="relative aspect-square bg-muted/30 rounded-2xl overflow-hidden group">
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
              
              {/* Sale Badge */}
              {product.isOnSale && (
                <Badge className="absolute top-4 left-4 bg-[#E53935] text-white border-0 text-sm px-3 py-1 animate-pulse">
                  OFERTA
                </Badge>
              )}

              {/* Favorite Button */}
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={cn(
                  'absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg',
                  isFavorite
                    ? 'bg-[#E53935] text-white scale-110'
                    : 'bg-white text-gray-600 hover:text-[#E53935] hover:scale-110'
                )}
              >
                <Heart className={cn('h-6 w-6 transition-transform', isFavorite && 'fill-current animate-scale-in')} />
              </button>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'relative w-20 h-20 rounded-lg overflow-hidden shrink-0 transition-all duration-300',
                      selectedImage === index 
                        ? 'ring-2 ring-[#E53935] ring-offset-2' 
                        : 'opacity-60 hover:opacity-100'
                    )}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} - ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6 animate-fade-in-up animation-delay-100">
            {/* Category & SKU */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-[#E53935] text-[#E53935] font-semibold">
                {product.categoryLabel}
              </Badge>
              {product.sku && (
                <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      'h-5 w-5 transition-all duration-300',
                      i < product.rating 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-gray-300'
                    )} 
                  />
                ))}
              </div>
              <span className="text-muted-foreground">
                ({product.reviewCount} resenas)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="font-heading text-4xl font-bold text-[#E53935]">
                ${product.price.toFixed(2)} {product.currency}
              </span>
              {product.originalPrice && (
                <span className="text-xl text-muted-foreground line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
              {product.isOnSale && product.originalPrice && (
                <Badge className="bg-green-500 text-white border-0">
                  -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                </Badge>
              )}
            </div>

            {/* Short Description */}
            <p className="text-lg text-muted-foreground leading-relaxed">
              {product.description}
            </p>

            {/* Weight */}
            {product.weight && (
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Contenido:</span> {product.weight}
              </p>
            )}

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-3 h-3 rounded-full',
                product.inStock ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className={cn(
                'font-medium',
                product.inStock ? 'text-green-600' : 'text-red-600'
              )}>
                {product.inStock ? 'En Stock' : 'Agotado'}
              </span>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {/* Quantity Selector */}
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="p-3 hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-16 text-center font-heading font-bold text-lg">
                  {quantity}
                </span>
                <button
                  onClick={incrementQuantity}
                  disabled={quantity >= 10}
                  className="p-3 hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={!product.inStock || isAddingToCart}
                className="flex-1 bg-[#E53935] hover:bg-[#C62828] text-white font-heading font-bold text-lg h-14 gap-3 transition-all duration-300 hover:shadow-xl hover:shadow-[#E53935]/30 disabled:opacity-50"
              >
                {isAddingToCart ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    AGREGANDO...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    AGREGAR AL CARRITO
                  </>
                )}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#E53935]/10 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-[#E53935]" />
                </div>
                <p className="text-sm font-medium">Envio Gratis</p>
                <p className="text-xs text-muted-foreground">En compras +$500</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#E53935]/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-[#E53935]" />
                </div>
                <p className="text-sm font-medium">Pago Seguro</p>
                <p className="text-xs text-muted-foreground">100% protegido</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#E53935]/10 flex items-center justify-center">
                  <RotateCcw className="h-6 w-6 text-[#E53935]" />
                </div>
                <p className="text-sm font-medium">Devoluciones</p>
                <p className="text-xs text-muted-foreground">30 dias</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Tabs */}
        <div className="mt-16 animate-fade-in-up animation-delay-200">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 gap-8">
              <TabsTrigger 
                value="description"
                className="font-heading font-bold text-lg pb-4 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-[#E53935] data-[state=active]:text-[#E53935] data-[state=active]:shadow-none bg-transparent"
              >
                DESCRIPCION
              </TabsTrigger>
              <TabsTrigger 
                value="specifications"
                className="font-heading font-bold text-lg pb-4 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-[#E53935] data-[state=active]:text-[#E53935] data-[state=active]:shadow-none bg-transparent"
              >
                ESPECIFICACIONES
              </TabsTrigger>
              {product.usage && (
                <TabsTrigger 
                  value="usage"
                  className="font-heading font-bold text-lg pb-4 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-[#E53935] data-[state=active]:text-[#E53935] data-[state=active]:shadow-none bg-transparent"
                >
                  MODO DE USO
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="description" className="pt-8">
              <div className="prose prose-lg max-w-none">
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {product.fullDescription || product.description}
                </p>
                {product.ingredients && (
                  <div className="mt-6">
                    <h4 className="font-heading font-bold text-xl mb-3">Ingredientes</h4>
                    <p className="text-muted-foreground">{product.ingredients}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="specifications" className="pt-8">
              {product.specifications && product.specifications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.specifications.map((spec, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Check className="h-5 w-5 text-[#E53935] shrink-0" />
                      <div>
                        <span className="font-semibold">{spec.label}:</span>
                        <span className="text-muted-foreground ml-2">{spec.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay especificaciones disponibles.</p>
              )}
            </TabsContent>

            {product.usage && (
              <TabsContent value="usage" className="pt-8">
                <div className="bg-muted/50 rounded-xl p-6">
                  <p className="text-lg leading-relaxed">{product.usage}</p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </section>
  );
}

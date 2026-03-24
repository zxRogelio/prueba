'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RelatedProductsProps {
  products: Product[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            PRODUCTOS <span className="text-[#E53935]">RELACIONADOS</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Otros productos que podrian interesarte
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <Card 
              key={product.id}
              className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-500 animate-fade-in-up bg-card"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Product Image */}
              <div className="relative aspect-square bg-muted/30 overflow-hidden">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Sale Badge */}
                {product.isOnSale && (
                  <Badge className="absolute top-3 left-3 bg-[#E53935] text-white border-0">
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
                      Ver producto
                    </Button>
                  </Link>
                </div>
              </div>

              <CardContent className="p-4">
                {/* Category */}
                <p className="text-[#E53935] text-xs font-semibold tracking-wider mb-1">
                  {product.categoryLabel}
                </p>

                {/* Title */}
                <Link href={`/productos/${product.id}`}>
                  <h3 className="font-heading font-bold text-lg line-clamp-2 group-hover:text-[#E53935] transition-colors mb-2">
                    {product.name}
                  </h3>
                </Link>

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

                {/* Add to Cart */}
                <Button 
                  className="w-full bg-[#E53935] hover:bg-[#C62828] text-white font-heading font-semibold gap-2 transition-all duration-300"
                >
                  <ShoppingCart className="h-4 w-4" />
                  AGREGAR
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-10 animate-fade-in-up animation-delay-300">
          <Link href="/productos">
            <Button 
              variant="outline" 
              size="lg"
              className="border-[#E53935] text-[#E53935] hover:bg-[#E53935] hover:text-white font-heading font-semibold px-8 transition-all duration-300"
            >
              VER TODOS LOS PRODUCTOS
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

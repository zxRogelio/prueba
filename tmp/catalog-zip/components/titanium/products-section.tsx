'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Star, ShoppingCart, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductsSectionProps {
  products: Product[];
}

export function ProductsSection({ products }: ProductsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'h-3.5 w-3.5',
          i < Math.floor(rating)
            ? 'fill-amber-400 text-amber-400'
            : 'fill-muted text-muted'
        )}
      />
    ));
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">
              TIENDA <span className="text-[#E53935]">ONLINE</span>
            </h2>
            <div className="h-1 w-20 bg-[#E53935] rounded-full" />
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={cn(
                'rounded-md border-[#E53935] transition-all',
                canScrollLeft
                  ? 'text-[#E53935] hover:bg-[#E53935] hover:text-white'
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={cn(
                'rounded-md border-[#E53935] transition-all',
                canScrollRight
                  ? 'text-[#E53935] hover:bg-[#E53935] hover:text-white'
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Products Carousel */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product, index) => (
            <Card
              key={product.id}
              className={cn(
                'flex-shrink-0 w-[280px] overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl animate-fade-in-up border-0 shadow-md'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Image Container */}
              <div className="relative aspect-square bg-muted overflow-hidden">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Sale Badge */}
                {product.isOnSale && (
                  <Badge className="absolute top-3 right-3 bg-[#E53935] text-white font-bold px-3 py-1">
                    Sale!
                  </Badge>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                  <Button
                    size="icon"
                    className="bg-[#E53935] hover:bg-[#C62828] text-white rounded-full h-10 w-10 transform -translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="bg-white hover:bg-white/90 text-foreground rounded-full h-10 w-10 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
                <h3 className="font-heading font-semibold text-lg mb-2 line-clamp-1">
                  {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                  {renderStars(product.rating)}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({product.reviewCount})
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  {product.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                  <span className="text-lg font-bold text-[#E53935]">
                    ${product.price.toFixed(2)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-[#E53935] hover:bg-[#C62828] text-white rounded-md"
                  >
                    Add to cart
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-foreground text-foreground hover:bg-foreground hover:text-background rounded-md"
                  >
                    Quick View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

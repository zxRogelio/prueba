import { notFound } from 'next/navigation';
import { getProductById, getRelatedProducts } from '@/lib/api';
import { Header } from '@/components/titanium/header';
import { Footer } from '@/components/titanium/footer';
import { ProductDetail } from '@/components/titanium/product-detail';
import { RelatedProducts } from '@/components/titanium/related-products';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(id, product.category);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Spacer for fixed header */}
      <div className="h-20" />

      {/* Product Detail */}
      <ProductDetail product={product} />

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <RelatedProducts products={relatedProducts} />
      )}

      <Footer />
    </div>
  );
}

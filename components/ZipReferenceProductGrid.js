import ZipReferenceProductCard from '@/components/ZipReferenceProductCard';
export default function ZipReferenceProductGrid({products=[]}){
 if(products.length===0)return <div className="py-20 text-center"><h3 className="text-xl font-semibold text-foreground">No products found</h3><p className="mt-2 text-muted-foreground">Tell me what you want to sell and I'll add it to your store.</p></div>;
 return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map((product)=><ZipReferenceProductCard key={product.id} product={product}/>)}</div>;
}

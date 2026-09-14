import Link from 'next/link';
import ProductsCatalogClient from '@/components/ProductsCatalogClient';

export const metadata={title:'Products | PinkBox',description:'Shop PinkBox products.'};

export default function ProductsPage(){
 return <ProductsCatalogClient/>;
}

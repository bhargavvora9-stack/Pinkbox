import './shop.css';
import { createAdminClient } from '@/lib/supabase-admin';
import PinkBoxShopListing from '@/components/PinkBoxShopListing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Shop Baby Diapers & Hygiene Essentials | PinkBox',
  description: 'Browse PinkBox baby diapers and everyday hygiene essentials. Compare pack sizes, listed prices and MRP, then order securely online.',
};

async function getShopData() {
  const db = createAdminClient();
  const { data: settings, error: settingsError } = await db
    .from('website_settings')
    .select('website_name,logo_url,phone,whatsapp_number,email,address,free_shipping_threshold,default_shipping_charge,cod_enabled,online_payment_enabled')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (settingsError || !settings) return { settings: settings || {}, products: [] };

  const { data: products, error } = await db
    .from('website_products')
    .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,featured,is_active')
    .eq('company_id', settings.company_id)
    .eq('is_active', true)
    .like('sku', 'MDH-%')
    .gt('price', 0)
    .order('created_at', { ascending: false });

  if (error || !products?.length) return { settings, products: [] };

  const ids = products.map((product) => product.id);
  const { data: images } = await db
    .from('website_product_images')
    .select('product_id,image_url,alt_text,sort_order,is_primary')
    .eq('company_id', settings.company_id)
    .in('product_id', ids)
    .order('sort_order');

  const imageMap = new Map();
  for (const image of images || []) {
    const current = imageMap.get(image.product_id) || [];
    current.push(image);
    imageMap.set(image.product_id, current);
  }

  const visibleProducts = products
    .filter((product) => product.track_inventory === false || product.allow_backorder === true || Number(product.stock_quantity || 0) > 0)
    .map((product) => {
      const productImages = (imageMap.get(product.id) || []).sort(
        (a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.sort_order || 0) - Number(b.sort_order || 0)
      );
      const fallback = { image_url: `/catalog-products/${product.sku.toLowerCase()}.webp`, alt_text: product.title, is_primary: true };
      return { ...product, images: productImages.length ? productImages : [fallback], image_url: productImages[0]?.image_url || fallback.image_url };
    });

  return { settings, products: visibleProducts };
}

export default async function ShopPage() {
  const data = await getShopData();
  return <PinkBoxShopListing settings={data.settings} products={data.products} />;
}

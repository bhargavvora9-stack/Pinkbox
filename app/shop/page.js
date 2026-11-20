import { createAdminClient } from '@/lib/supabase-admin';
import { filterAvailableProducts } from '@/lib/product-availability';
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
    .select('company_id,website_name,logo_url,phone,whatsapp_number,email,address,instagram_url,facebook_url,youtube_url,announcement_text,free_shipping_threshold,default_shipping_charge,cod_enabled,online_payment_enabled')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();

  if (settingsError || !settings) return { settings: settings || {}, products: [] };

  const [productsResult, variantsResult] = await Promise.all([
    db.from('website_products')
      .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,featured,is_active')
      .eq('company_id', settings.company_id)
      .eq('is_active', true)
      .like('sku', 'MDH-%')
      .gt('price', 0)
      .order('created_at', { ascending: false }),
    db.from('website_product_variants')
      .select('product_id,stock_quantity,is_active')
      .eq('company_id', settings.company_id)
      .eq('is_active', true),
  ]);

  // Fail closed when inventory could not be checked; never advertise an item as available
  // if the source of truth for stock is unavailable.
  if (productsResult.error || variantsResult.error || !productsResult.data?.length) {
    return { settings, products: [] };
  }

  const visibleProducts = filterAvailableProducts(productsResult.data, variantsResult.data || []);
  if (!visibleProducts.length) return { settings, products: [] };

  const ids = visibleProducts.map((product) => product.id);
  const { data: images, error: imagesError } = await db
    .from('website_product_images')
    .select('product_id,image_url,alt_text,sort_order,is_primary')
    .eq('company_id', settings.company_id)
    .in('product_id', ids)
    .order('sort_order');

  if (imagesError) return { settings, products: [] };

  const imageMap = new Map();
  for (const image of images || []) {
    const current = imageMap.get(image.product_id) || [];
    current.push(image);
    imageMap.set(image.product_id, current);
  }

  const products = visibleProducts.map((product) => {
    const productImages = (imageMap.get(product.id) || []).sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.sort_order || 0) - Number(b.sort_order || 0)
    );
    const fallback = { image_url: `/catalog-products/${product.sku.toLowerCase()}.webp`, alt_text: product.title, is_primary: true };
    return { ...product, images: productImages.length ? productImages : [fallback], image_url: productImages[0]?.image_url || fallback.image_url };
  });

  return { settings, products };
}

export default async function ShopPage() {
  const data = await getShopData();
  return <PinkBoxShopListing settings={data.settings} products={data.products} />;
}

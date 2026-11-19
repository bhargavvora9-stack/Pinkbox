import { createAdminClient } from '@/lib/supabase-admin';
import { filterAvailableProducts } from '@/lib/product-availability';

export const dynamic = 'force-dynamic';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1/responses';
const MODEL = 'openai/gpt-6-astra';

function extractOutputText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n');
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query || '').trim();
    if (query.length < 3 || query.length > 500) {
      return Response.json({ error: 'Describe what you need in 3 to 500 characters.' }, { status: 400 });
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Product finder is temporarily unavailable.' }, { status: 503 });
    }

    const db = createAdminClient();
    const { data: settings, error: settingsError } = await db
      .from('website_settings')
      .select('company_id')
      .eq('slug', 'pinkbox')
      .eq('status', 'active')
      .maybeSingle();
    if (settingsError || !settings?.company_id) {
      return Response.json({ error: 'Product catalogue is temporarily unavailable.' }, { status: 503 });
    }

    const [productsResult, variantsResult] = await Promise.all([
      db.from('website_products')
        .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,is_active,requires_personalization')
        .eq('company_id', settings.company_id)
        .eq('is_active', true)
        .like('sku', 'MDH-%')
        .gt('price', 0)
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('website_product_variants')
        .select('product_id,stock_quantity,is_active')
        .eq('company_id', settings.company_id)
        .eq('is_active', true),
    ]);
    if (productsResult.error || variantsResult.error) {
      return Response.json({ error: 'Unable to load the product catalogue.' }, { status: 503 });
    }

    const saleable = filterAvailableProducts(productsResult.data || [], variantsResult.data || []);
    if (!saleable.length) {
      return Response.json({ message: 'Our catalogue is empty right now — please check back soon.', products: [], reasons: {} });
    }

    const catalog = saleable.map((product) => ({
      handle: product.slug,
      title: product.title,
      description: String(product.short_description || product.description || '').slice(0, 300),
      price: '₹' + Number(product.price || 0).toFixed(2),
    }));

    const instructions =
      'You are a friendly, discreet shopping assistant for a women’s menstrual care brand. ' +
      'Recommend up to 3 products ONLY from the given catalogue that match the shopper’s needs. ' +
      'Never invent products or make medical claims. Do not diagnose, promise health outcomes, or claim a product treats a condition. ' +
      'If nothing fits, return an empty picks list and say so kindly. ' +
      'Return only JSON: {"message":"1-2 sentence explanation","picks":[{"handle":"catalog handle","reason":"20 words maximum"}]}.';
    const prompt = 'Catalogue:\n' + JSON.stringify(catalog) + '\n\nShopper request: ' + query;

    const response = await fetch(GATEWAY, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'vercel-ai-sdk',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: instructions }] },
          { role: 'user', content: [{ type: 'input_text', text: prompt }] },
        ],
        text: { format: { type: 'json_object' } },
        reasoning: { effort: 'low', summary: 'auto' },
        store: false,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 429) {
        return Response.json({ error: 'Lots of shoppers right now — please try again in a moment.' }, { status: 429 });
      }
      if (response.status === 402 || response.status === 403) {
        return Response.json({ error: 'Product finder is temporarily unavailable.' }, { status: 503 });
      }
      console.error('Product recommendation gateway returned', response.status);
      return Response.json({ error: 'Couldn’t get suggestions right now. Please try again.' }, { status: 502 });
    }

    const payload = await response.json();
    const output = extractOutputText(payload);
    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');
    let recommendation;
    try {
      recommendation = JSON.parse(start >= 0 && end >= start ? output.slice(start, end + 1) : output);
    } catch {
      recommendation = { message: output.trim() || 'Sorry, I couldn’t find a match.', picks: [] };
    }

    const valid = new Map(saleable.map((product) => [product.slug, product]));
    const reasons = {};
    const products = [];
    for (const pick of Array.isArray(recommendation.picks) ? recommendation.picks : []) {
      const handle = String(pick?.handle || '');
      const product = valid.get(handle);
      if (!product || products.some((item) => item.id === product.id)) continue;
      products.push(product);
      reasons[handle] = String(pick.reason || '').slice(0, 180);
      if (products.length === 3) break;
    }

    return Response.json({
      message: String(recommendation.message || 'Here are a few options from our catalogue.'),
      products,
      reasons,
    });
  } catch (error) {
    console.error('Product finder failed:', error);
    return Response.json({ error: 'Couldn’t get suggestions right now. Please try again.' }, { status: 500 });
  }
}

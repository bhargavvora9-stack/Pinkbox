import { createAdminClient } from '@/lib/supabase-admin';
import { filterAvailableProducts } from '@/lib/product-availability';

export const dynamic = 'force-dynamic';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1/responses';
const MODEL = 'openai/gpt-6-astra';
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'for', 'from', 'have', 'i', 'in', 'is', 'it',
  'me', 'my', 'of', 'on', 'or', 'please', 'the', 'to', 'with', 'you', 'your',
  'need', 'want', 'looking', 'something', 'product', 'products'
]);

const normalize = (value) => String(value ?? '')
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

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

function localRecommendations(query, catalogue) {
  const normalizedQuery = normalize(query);
  const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  const expandedTokens = new Set(queryTokens);

  const synonymGroups = [
    { pattern: /heavy|overnight|night|sleep|long|320\s?mm/, terms: ['heavy', 'overnight', 'night', 'xxl', 'xxxl', '320mm', 'maxi', 'long'] },
    { pattern: /light|thin|daily|daytime/, terms: ['light', 'thin', 'daily', 'regular', 'ultra', 'day'] },
    { pattern: /sensitive|rash|irritat|soft|cotton|gentle/, terms: ['soft', 'cotton', 'cottony', 'gentle', 'breathable'] },
    { pattern: /diaper|nappy|baby/, terms: ['baby', 'diaper', 'diapers', 'nappy', 'nappies', 'pants'] },
  ];
  for (const group of synonymGroups) {
    if (group.pattern.test(normalizedQuery)) {
      for (const term of group.terms) {
        for (const token of normalize(term).split(' ')) expandedTokens.add(token);
      }
    }
  }

  const asksForDiapers = /diaper|nappy|baby/.test(normalizedQuery);
  const asksForPads = /sanitary|pad|napkin|period|menstrual|flow/.test(normalizedQuery);
  const scored = catalogue.map((product) => {
    const searchable = normalize([
      product.title,
      product.brand,
      product.short_description,
      product.description,
      product.sku,
    ].join(' '));
    const searchableTokens = new Set(searchable.split(' ').filter(Boolean));

    // Keep category intent strict so a diaper request never receives a pad recommendation.
    if (asksForDiapers && !/diaper|nappy|baby/.test(searchable)) return { product, score: 0, matched: [] };
    if (asksForPads && !asksForDiapers && !/sanitary|pad|napkin|menstrual|period/.test(searchable)) {
      return { product, score: 0, matched: [] };
    }

    let score = normalizedQuery && searchable.includes(normalizedQuery) ? 6 : 0;
    const matched = [];
    for (const token of expandedTokens) {
      if (searchableTokens.has(token)) {
        score += queryTokens.includes(token) ? 2 : 1;
        matched.push(token);
      }
    }
    if (product.featured) score += 0.25;
    return { product, score, matched };
  }).filter((item) => item.score > 0);

  scored.sort((a, b) => b.score - a.score || Number(b.product.featured) - Number(a.product.featured));
  const picks = scored.slice(0, 3);
  const products = picks.map((item) => item.product);
  const reasons = {};
  for (const item of picks) {
    const featureTerms = item.matched.filter((term) => ['xxl', 'xxxl', '320mm', 'maxi', 'cotton', 'cottony', 'soft', 'thin', 'diaper', 'pants'].includes(term));
    reasons[item.product.slug] = featureTerms.length
      ? 'The product details include: ' + featureTerms.slice(0, 3).join(', ') + '.'
      : 'This is one of the closest matches in the current product catalogue.';
  }

  return {
    message: products.length
      ? 'Here are the closest matches from our current catalogue. Please check each product page for pack size and full details.'
      : 'I could not find a clear match in the current catalogue. Please browse the products or try describing the product type and pack size.',
    products,
    reasons,
  };
}

function validateAiRecommendation(recommendation, saleable) {
  const valid = new Map(saleable.map((product) => [product.slug, product]));
  const reasons = {};
  const products = [];
  for (const pick of Array.isArray(recommendation?.picks) ? recommendation.picks : []) {
    const handle = String(pick?.handle || '');
    const product = valid.get(handle);
    if (!product || products.some((item) => item.id === product.id)) continue;
    products.push(product);
    reasons[handle] = String(pick.reason || '').slice(0, 180);
    if (products.length === 3) break;
  }
  return {
    message: String(recommendation?.message || 'Here are a few options from our catalogue.').slice(0, 500),
    products,
    reasons,
  };
}

async function getAiRecommendation(apiKey, query, saleable) {
  const catalog = saleable.map((product) => ({
    handle: product.slug,
    title: product.title,
    description: String(product.short_description || product.description || '').slice(0, 300),
    price: '₹' + Number(product.price || 0).toFixed(2),
  }));
  const instructions =
    'You are a friendly, discreet shopping assistant for a women’s hygiene brand. ' +
    'Recommend up to 3 products ONLY from the supplied catalogue that match the shopper’s request. ' +
    'Never invent products or make medical claims. Do not diagnose, promise health outcomes, or claim a product treats a condition. ' +
    'If nothing fits, return an empty picks list and say so kindly. ' +
    'Return only JSON: {"message":"1-2 sentence explanation","picks":[{"handle":"catalog handle","reason":"20 words maximum"}]}.';
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
        { role: 'user', content: [{ type: 'input_text', text: 'Catalogue:\n' + JSON.stringify(catalog) + '\n\nShopper request: ' + query }] },
      ],
      text: { format: { type: 'json_object' } },
      reasoning: { effort: 'low', summary: 'auto' },
      store: false,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    console.warn('Product recommendation gateway unavailable:', response.status);
    return null;
  }

  const payload = await response.json();
  const output = extractOutputText(payload);
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  try {
    const parsed = JSON.parse(start >= 0 && end >= start ? output.slice(start, end + 1) : output);
    return validateAiRecommendation(parsed, saleable);
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query || '').trim();
    if (query.length < 3 || query.length > 500) {
      return Response.json({ error: 'Describe what you need in 3 to 500 characters.' }, { status: 400 });
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
        .select('id,sku,title,slug,short_description,description,brand,price,compare_at_price,stock_quantity,track_inventory,allow_backorder,is_active,featured')
        .eq('company_id', settings.company_id)
        .eq('is_active', true)
        .or('sku.like.MDH-%,sku.like.BAG-%')
        .gt('price', 0)
        .order('created_at', { ascending: false })
        .limit(100),
      db.from('website_product_variants')
        .select('id,product_id,title,sku,price,compare_at_price,stock_quantity,image_url,is_active')
        .eq('company_id', settings.company_id)
        .eq('is_active', true),
    ]);
    if (productsResult.error || variantsResult.error) {
      return Response.json({ error: 'Unable to load the product catalogue.' }, { status: 503 });
    }

    const variantsByProductId = new Map();
    for (const variant of variantsResult.data || []) {
      const items = variantsByProductId.get(variant.product_id) || [];
      items.push(variant);
      variantsByProductId.set(variant.product_id, items);
    }
    const catalogue = (productsResult.data || []).map((product) => ({
      ...product,
      variants: variantsByProductId.get(product.id) || [],
    }));
    const saleable = filterAvailableProducts(catalogue, variantsResult.data || []);
    if (!saleable.length) {
      return Response.json({ message: 'Our catalogue is empty right now — please check back soon.', products: [], reasons: {} });
    }

    // The local matcher keeps this feature useful even when no AI provider key is configured
    // or the external AI service is temporarily unavailable.
    const apiKey = process.env.LOVABLE_API_KEY;
    if (apiKey) {
      const aiResult = await getAiRecommendation(apiKey, query, saleable);
      if (aiResult) return Response.json(aiResult);
    }

    return Response.json(localRecommendations(query, saleable));
  } catch (error) {
    console.error('Product finder failed:', error);
    return Response.json({ error: 'Couldn’t get suggestions right now. Please try again.' }, { status: 500 });
  }
}

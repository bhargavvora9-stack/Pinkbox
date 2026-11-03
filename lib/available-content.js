const CATEGORY_ALIASES = {
  'sanitary-pads': ['sanitary', 'sanitary pad', 'sanitary pads', 'sanitary napkin', 'menstrual care', 'period care'],
  'baby-diapers': ['baby diaper', 'baby diapers', 'diaper', 'diapers', 'nappy', 'nappies'],
  bags: ['tote bag', 'tote bags', 'cotton tote', 'embroidered bag', 'embroidered tote', 'personalized bag', 'personalised bag'],
};

const normalize = (value) => String(value ?? '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function getAvailableCategoryIds({ products = [], mappings = [] }) {
  const availableProductIds = new Set(
    products
      .filter((product) => product?.is_active === true && Number(product?.price || 0) > 0)
      .map((product) => product.id)
  );
  return new Set(
    mappings
      .filter((mapping) => availableProductIds.has(mapping.product_id))
      .map((mapping) => mapping.category_id)
  );
}

export function getContentCategoryIds(item, { categories = [], products = [], mappings = [] }) {
  const text = normalize([
    item?.title,
    item?.slug,
    item?.seo_title,
    item?.seo_description,
    item?.seo_keywords,
  ].join(' '));

  const availableProductsBySlug = new Map(
    products
      .filter((product) => product?.is_active === true && Number(product?.price || 0) > 0)
      .map((product) => [normalize(product.slug), product.id])
  );
  const categoryIds = new Set();

  // Strongest signal: a direct internal product link in the article/page.
  const html = typeof item?.content === 'string' ? item.content : item?.content?.html || '';
  const links = [...String(html).matchAll(/\/products\/([a-z0-9-]+)/gi)];
  const linkedProductIds = new Set(
    links.map((match) => availableProductsBySlug.get(normalize(match[1]))).filter(Boolean)
  );
  for (const mapping of mappings) {
    if (linkedProductIds.has(mapping.product_id)) categoryIds.add(mapping.category_id);
  }

  // Existing CMS records do not yet have a category_id field. Match their
  // title/slug/copy against the category's own name plus conservative aliases.
  for (const category of categories) {
    const slug = normalize(category.slug);
    const name = normalize(category.name);
    const aliases = [
      ...(CATEGORY_ALIASES[category.slug] || []),
      name,
      name.endsWith('s') ? name.slice(0, -1) : '',
      slug.replace(/-/g, ' '),
      ...slug.split('-').filter((part) => part.length > 3),
    ].filter(Boolean);

    if (aliases.some((term) => {
      const normalizedTerm = normalize(term);
      if (normalizedTerm.includes(' ')) return text.includes(normalizedTerm);
      const pattern = new RegExp('\\b' + escapeRegExp(normalizedTerm) + '(?:s|es)?\\b', 'i');
      return pattern.test(text);
    })) {
      categoryIds.add(category.id);
    }
  }

  return categoryIds;
}

export function isContentLiveForAvailableCategory(item, context, { keepUncategorized = true } = {}) {
  const matched = getContentCategoryIds(item, context);
  if (matched.size === 0) return keepUncategorized;
  const available = getAvailableCategoryIds(context);
  return [...matched].some((categoryId) => available.has(categoryId));
}

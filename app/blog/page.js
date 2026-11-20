import Link from 'next/link';
import ZipReferenceHeader from '@/components/ZipReferenceHeader';
import ZipReferenceFooter from '@/components/ZipReferenceFooter';
import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase-admin';
import { absoluteUrl, safeJsonLd } from '@/lib/seo';
import { isContentLiveForAvailableCategory } from '@/lib/available-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TITLE = 'Period Education Hub — Pink Box Blog';
const DESCRIPTION = 'Honest, doctor-informed articles on periods, menstrual hygiene, cramps and pad care from the Pink Box period education hub.';

async function getBlogStore() {
  const db = createAdminClient();
  const { data: settings } = await db
    .from('website_settings')
    .select('company_id,website_name,meta_title,meta_description,logo_url')
    .eq('slug', 'pinkbox')
    .eq('status', 'active')
    .maybeSingle();
  return { db, settings, now: Date.now() };
}

export async function generateMetadata() {
  const { settings } = await getBlogStore();
  const siteName = settings?.website_name || 'PinkBox';
  return {
    title: settings ? TITLE.replace('Pink Box', siteName) : TITLE,
    description: DESCRIPTION,
    keywords: ['PinkBox journal', 'period education', 'menstrual hygiene', 'cramps', 'pad care'],
    alternates: { canonical: '/blog' },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: absoluteUrl('/blog'),
      type: 'website',
      images: settings?.logo_url ? [settings.logo_url] : undefined,
    },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: settings?.logo_url ? [settings.logo_url] : undefined },
  };
}

export default async function BlogIndex() {
  const { db, settings, now } = await getBlogStore();
  if (!settings) return <main className="p-10">PinkBox is not configured.</main>;

  const [postsResult, categoriesResult, productsResult, mappingsResult] = await Promise.all([
    db.from('website_blog_posts')
      .select('id,title,slug,excerpt,content,seo_title,seo_description,seo_keywords,cover_image_url,published_at')
      .eq('company_id', settings.company_id)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(50),
    db.from('website_categories').select('id,name,slug').eq('company_id', settings.company_id).eq('is_active', true),
    db.from('website_products').select('id,slug,is_active,price').eq('company_id', settings.company_id).eq('is_active', true).gt('price', 0),
    db.from('website_product_categories').select('product_id,category_id').eq('company_id', settings.company_id),
  ]);

  if (postsResult.error) throw new Error(postsResult.error.message);
  if (categoriesResult.error || productsResult.error || mappingsResult.error) {
    throw new Error('Unable to load live category information.');
  }

  const context = {
    categories: categoriesResult.data || [],
    products: productsResult.data || [],
    mappings: mappingsResult.data || [],
  };
  const posts = (postsResult.data || [])
    .filter((post) => !post.published_at || new Date(post.published_at).getTime() <= now)
    .filter((post) => isContentLiveForAvailableCategory(post, context, { keepUncategorized: false }));

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `PinkBox Journal | ${settings.website_name || 'PinkBox'}`,
    url: absoluteUrl('/blog'),
    description: DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: settings.website_name || 'PinkBox',
      url: absoluteUrl('/'),
      ...(settings.logo_url ? { logo: { '@type': 'ImageObject', url: settings.logo_url } } : {}),
    },
  };
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Journal', item: absoluteUrl('/blog') },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <ZipReferenceHeader settings={settings} />
      <main className="container mx-auto px-4 py-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(blogSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(crumbs) }} />
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Period education hub</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground">
          Learn about your cycle, without the whispers
        </h1>
        {posts.length === 0 ? (
          <p className="mt-10 text-muted-foreground">New articles are coming soon.</p>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-soft"
              >
                {post.cover_image_url && (
                  <div className="relative h-48 w-full overflow-hidden">
                    <Image
                      src={post.cover_image_url}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                    {post.category || 'Period education'}
                  </span>
                  <h2 className="mt-2 font-display text-xl font-semibold text-foreground group-hover:text-primary">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <ZipReferenceFooter settings={settings} />
    </div>
  );
}

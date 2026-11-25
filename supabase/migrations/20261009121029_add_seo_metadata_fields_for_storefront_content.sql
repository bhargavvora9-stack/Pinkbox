ALTER TABLE public.website_categories
  ADD COLUMN IF NOT EXISTS seo_keywords text;

ALTER TABLE public.website_pages
  ADD COLUMN IF NOT EXISTS seo_keywords text;

ALTER TABLE public.website_blog_posts
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text;

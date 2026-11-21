'use client';

import { useEffect, useMemo, useState } from 'react';
import { Upload, Trash2, RefreshCw, Image as ImageIcon, Star, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import Image from 'next/image';
import { prepareProductImage } from '@/lib/prepare-product-image';

const sb = createClient();
const input = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10';

export default function WebsiteProductImageUploader() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [alt, setAlt] = useState('');
  const [primary, setPrimary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/website/products', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw Error(json.error || 'Unable to load products');
      setProducts(json.data || []);
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async (id) => {
    if (!id) {
      setImages([]);
      return;
    }
    try {
      const response = await fetch('/api/website/images', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw Error(json.error || 'Unable to load images');
      setImages((json.data || []).filter((image) => image.product_id === id).sort((a, b) => (
        a.is_primary === b.is_primary
          ? Number(a.sort_order || 0) - Number(b.sort_order || 0)
          : (a.is_primary ? -1 : 1)
      )));
    } catch (error) {
      setErr(error.message);
    }
  };

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { loadImages(productId); }, [productId]);

  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);

  const addFiles = (selected) => {
    setFiles((current) => {
      const next = [...current];
      selected.forEach((file) => {
        const duplicate = next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
        if (!duplicate) next.push(file);
      });
      return next;
    });
  };

  const upload = async () => {
    if (!productId) {
      setErr('Select a product first.');
      return;
    }
    if (!files.length) {
      setErr('Select one or more images.');
      return;
    }

    setUploading(true);
    setUploadCount(0);
    setErr('');
    setMsg('');
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw Error('Please sign in again.');
      const { data: profile, error: profileError } = await sb.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
      if (profileError || !profile?.company_id) throw Error(profileError?.message || 'Company access unavailable.');

      const selectedFiles = files.slice();
      const baseCount = images.length;
      const failedFiles = [];
      const errors = [];
      let uploaded = 0;

      // Upload one file at a time. A bad/oversized file is reported but never
      // prevents the remaining selected images from being processed.
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const original = selectedFiles[index];
        try {
          const file = await prepareProductImage(original, { maxBytes: 5 * 1024 * 1024 });
          if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            throw Error('Unsupported image type. Use JPG, PNG, WEBP or GIF.');
          }
          if (file.size > 5 * 1024 * 1024) throw Error('Maximum size is 5 MB after optimization.');

          const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
          const path = profile.company_id + '/' + productId + '/' + crypto.randomUUID() + '-' + safe;
          const { error: uploadError } = await sb.storage.from('product-images').upload(path, file, {
            contentType: file.type,
            upsert: false,
          });
          if (uploadError) throw Error(uploadError.message);

          const { data: publicData } = sb.storage.from('product-images').getPublicUrl(path);
          const shouldPrimary = uploaded === 0 && (primary || baseCount === 0);
          const response = await fetch('/api/website/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: productId,
              image_url: publicData.publicUrl,
              alt_text: alt || product?.title || '',
              sort_order: baseCount + uploaded,
              is_primary: shouldPrimary,
            }),
          });
          const json = await response.json().catch(() => ({}));
          if (!response.ok) throw Error(json.error || 'Image record save failed.');
          uploaded += 1;
        } catch (error) {
          failedFiles.push(original);
          errors.push(original.name + ': ' + (error.message || 'Upload failed.'));
        } finally {
          setUploadCount(index + 1);
        }
      }

      setFiles(failedFiles);
      await loadImages(productId);
      if (errors.length) {
        setErr(uploaded + ' image(s) uploaded. ' + errors.join(' ') + ' Failed images are still selected; retry them or remove them with ×.');
      } else {
        setMsg(uploaded + ' image' + (uploaded === 1 ? '' : 's') + ' uploaded successfully.');
        setAlt('');
        setPrimary(false);
      }
    } catch (error) {
      setErr(error.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (image) => {
    if (!confirm('Delete this product image?')) return;
    setErr('');
    const response = await fetch('/api/website/images?id=' + encodeURIComponent(image.id), { method: 'DELETE' });
    const json = await response.json();
    if (!response.ok) setErr(json.error || 'Delete failed');
    else {
      setMsg('Image deleted.');
      loadImages(productId);
    }
  };

  const makePrimary = async (image) => {
    const response = await fetch('/api/website/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: image.id, product_id: productId, is_primary: true }),
    });
    const json = await response.json();
    if (!response.ok) setErr(json.error || 'Unable to change primary image');
    else {
      setMsg('Primary image updated.');
      loadImages(productId);
    }
  };

  return (
    <div className="space-y-4 text-gray-900">
      <div>
        <h1 className="text-2xl font-semibold">Product Images</h1>
        <p className="mt-1 text-sm text-gray-500">Manage the complete gallery used by product cards and the product popup.</p>
      </div>

      {(err || msg) && (
        <div className={'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ' + (err ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700')}>
          {err ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
          {err || msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-1 text-sm font-semibold">1. Select Product</div>
          <select
            value={productId}
            onChange={(event) => {
              setProductId(event.target.value);
              setFiles([]);
              setErr('');
              setMsg('');
            }}
            className={input}
            disabled={loading || uploading}
          >
            <option value="">{loading ? 'Loading products…' : 'Select product'}</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.title}{item.sku ? ' · ' + item.sku : ''}</option>)}
          </select>

          {product && (
            <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
              <div className="font-medium text-gray-900">{product.title}</div>
              <div>SKU: {product.sku || '—'} · Current images: {images.length}</div>
            </div>
          )}

          <div className="mt-5 mb-1 text-sm font-semibold">2. Choose Images</div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={uploading}
            onChange={(event) => {
              addFiles(Array.from(event.target.files || []));
              event.target.value = '';
            }}
            className="block w-full text-sm"
          />
          <div className="mt-2 text-xs text-gray-500">JPG, PNG, WEBP or GIF · up to 5 MB each · multiple files supported. Large photos are optimized automatically.</div>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div key={file.name + '-' + file.size + '-' + index} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-800">{file.name}</p>
                    <p className="text-[11px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                    aria-label={'Remove ' + file.name + ' before upload'}
                    title="Remove before upload"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              {uploading && <p className="text-xs font-semibold text-pink-600">Processed {uploadCount}/{files.length} image(s)…</p>}
            </div>
          )}

          <input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Alt text (optional)" className={input + ' mt-4'} />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} disabled={uploading} />
            Set first successfully uploaded image as primary
          </label>
          <button onClick={upload} disabled={uploading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <Upload size={17} />{uploading ? 'Uploading…' : 'Upload Images'}
          </button>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <ImageIcon size={18} /> Existing Images <span className="text-xs font-normal text-gray-500">({images.length})</span>
            </div>
            <button onClick={() => loadImages(productId)} className="rounded-lg border px-2 py-2"><RefreshCw size={15} /></button>
          </div>
          {!productId ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">Select a product to view its images.</div>
          ) : images.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No images uploaded yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-xl border bg-white">
                  <div className="aspect-square bg-gray-50">
                    <Image src={image.image_url} alt={image.alt_text || ''} width={600} height={600} unoptimized className="h-full w-full object-contain p-2" />
                  </div>
                  <div className="p-2">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      {image.is_primary
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-1 font-medium text-pink-700"><Star size={12} fill="currentColor" />Primary</span>
                        : <button onClick={() => makePrimary(image)} className="text-gray-500 hover:text-pink-600">Make primary</button>}
                      <button onClick={() => remove(image)} className="rounded-lg p-1.5 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

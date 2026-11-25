'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, Star, Trash2 } from 'lucide-react';

function Stars({ value = 0 }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((number) => (
        <Star
          key={number}
          className={`h-3.5 w-3.5 ${number <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/40'}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review, approved, busy, onApprove, onRemove }) {
  const date = review.created_at
    ? new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date unavailable';
  const productName = review.product_title || review.product_slug || 'Product';
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Stars value={review.rating} />
        <span className="font-medium text-foreground">{review.customer_name || 'Customer'}</span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">{productName}</span>
        <span className="text-xs text-muted-foreground">{date}</span>
        {review.is_verified_purchase
          ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Verified purchase</span>
          : <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">Not purchase-verified</span>}
        {approved && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Live</span>}
      </div>
      {review.title && <p className="mt-2 font-medium text-foreground">{review.title}</p>}
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{review.review_text || 'No written review.'}</p>
      {review.product_slug && (
        <a href={`/products/${encodeURIComponent(review.product_slug)}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
          View product
        </a>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!approved && (
          <button type="button" onClick={() => onApprove(review.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve
          </button>
        )}
        <button type="button" onClick={() => onRemove(review.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          {approved ? 'Remove' : 'Reject'}
        </button>
      </div>
    </article>
  );
}

export default function WebsiteReviewModeration() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/website/phase2?resource=reviews', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load reviews.');
      setReviews(Array.isArray(result.data) ? result.data : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function approve(id) {
    setWorkingId(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/website/phase2?resource=reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_approved: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not approve review.');
      setNotice('Review approved and published on the product page.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not approve review.');
    } finally {
      setWorkingId('');
    }
  }

  async function remove(id) {
    if (!window.confirm('Remove this review? This action cannot be undone.')) return;
    setWorkingId(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/website/phase2?resource=reviews&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not remove review.');
      setNotice('Review removed.');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not remove review.');
    } finally {
      setWorkingId('');
    }
  }

  const pending = reviews.filter((review) => !review.is_approved);
  const approved = reviews.filter((review) => review.is_approved);

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">Approve new reviews to show them on product pages, or remove spam. Only approved reviews are visible to shoppers.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} aria-label="Refresh reviews" className="rounded-xl border border-border bg-background p-2.5 hover:bg-secondary disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {(error || notice) && (
        <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-border bg-secondary/60 text-foreground'}`}>
          {error || notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No reviews yet. Reviews submitted on product pages will appear here.</p>
      ) : (
        <>
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Waiting for approval</h2>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{pending.length} pending</span>
            </div>
            {pending.length ? (
              <ul className="space-y-3">{pending.map((review) => <li key={review.id}><ReviewCard review={review} approved={false} busy={workingId === review.id} onApprove={approve} onRemove={remove} /></li>)}</ul>
            ) : <p className="text-sm text-muted-foreground">Nothing pending — all caught up.</p>}
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Approved — live on site ({approved.length})</h2>
            {approved.length ? (
              <ul className="space-y-3">{approved.map((review) => <li key={review.id}><ReviewCard review={review} approved busy={workingId === review.id} onApprove={approve} onRemove={remove} /></li>)}</ul>
            ) : <p className="text-sm text-muted-foreground">No approved reviews yet.</p>}
          </section>
        </>
      )}
    </div>
  );
}

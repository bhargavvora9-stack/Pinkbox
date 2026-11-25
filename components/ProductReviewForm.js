'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Star } from 'lucide-react';

export default function ProductReviewForm({ productId }) {
  const [eligibility, setEligibility] = useState({
    loading: true,
    authenticated: false,
    eligible: false,
    alreadyReviewed: false,
    emailVerified: false,
    message: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);

  const refreshEligibility = useCallback(async () => {
    setEligibility((current) => ({ ...current, loading: true }));
    try {
      const response = await fetch(
        `/api/storefront/reviews?product_id=${encodeURIComponent(productId)}`,
        { cache: 'no-store' },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to check review eligibility.');
      setEligibility({
        loading: false,
        authenticated: Boolean(result.authenticated),
        eligible: Boolean(result.eligible),
        alreadyReviewed: Boolean(result.alreadyReviewed),
        emailVerified: Boolean(result.emailVerified),
        customerName: result.customerName || '',
        message: result.message || '',
      });
    } catch (requestError) {
      setEligibility({
        loading: false,
        authenticated: false,
        eligible: false,
        alreadyReviewed: false,
        emailVerified: false,
        message: requestError instanceof Error
          ? requestError.message
          : 'Unable to check review eligibility. Please refresh the page.',
      });
    }
  }, [productId]);

  useEffect(() => {
    refreshEligibility();
  }, [refreshEligibility]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const response = await fetch('/api/storefront/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          rating,
          title,
          review_text: body,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not submit review.');

      setSuccess(result.message || 'Thank you! Your review is awaiting approval.');
      setShowForm(false);
      setTitle('');
      setBody('');
      setRating(5);
      await refreshEligibility();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not submit review.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full sm:w-auto">
      {success && <p className="mb-3 text-sm text-muted-foreground" role="status">{success}</p>}

      {eligibility.loading ? (
        <p className="text-sm text-muted-foreground">Checking your PinkBox order…</p>
      ) : eligibility.eligible ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Posting as {eligibility.customerName}</span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              Verified purchase
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((visible) => !visible);
              setError('');
            }}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {showForm ? 'Cancel review' : 'Write a review'}
          </button>

          {showForm && (
            <form onSubmit={submit} className="mt-6 w-full min-w-0 max-w-full space-y-4 rounded-lg border border-border bg-card p-6 sm:min-w-[320px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Your rating:</span>
                <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={value + ' star' + (value > 1 ? 's' : '')}
                      onClick={() => setRating(value)}
                    >
                      <Star className={'h-6 w-6 ' + (value <= rating
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground/40')} />
                    </button>
                  ))}
                </div>
              </div>
              <label htmlFor="review-title" className="sr-only">Review title (optional)</label>
              <input
                id="review-title"
                placeholder="Review title (optional)"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <label htmlFor="review-body" className="sr-only">How was your experience with this product?</label>
              <textarea
                id="review-body"
                placeholder="How was your experience with this product?"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
                minLength={10}
                maxLength={3000}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary"
              />
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit review
              </button>
            </form>
          )}
        </>
      ) : (
        <div className="max-w-xl rounded-lg border border-dashed border-border px-4 py-4">
          <p className="text-sm text-muted-foreground">{eligibility.message}</p>
          {!eligibility.authenticated && (
            <Link
              href="/account/login"
              className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Sign in or create an account
            </Link>
          )}
          {eligibility.authenticated && !eligibility.alreadyReviewed && !eligibility.emailVerified && (
            <Link
              href="/account"
              className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Go to My Account
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

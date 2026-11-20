'use client';

import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';

export default function ProductReviewForm({ productId, hasReviews = false }) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);

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
          customer_name: name,
          title,
          review_text: body,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not submit review.');

      setSuccess(result.message || 'Thank you! Your review will appear once approved.');
      setShowForm(false);
      setName('');
      setTitle('');
      setBody('');
      setRating(5);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not submit review.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => {
          setShowForm((visible) => !visible);
          setError('');
          setSuccess('');
        }}
        className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {showForm ? 'Cancel review' : 'Write a review'}
      </button>

      {success && <p className="mt-3 text-sm text-muted-foreground" role="status">{success}</p>}

      {showForm && (
        <form onSubmit={submit} className="mt-6 w-full space-y-4 rounded-lg border border-border bg-card p-6 sm:min-w-[320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="review-name" className="sr-only">Your name</label>
              <input
                id="review-name"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={180}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
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

      {!hasReviews && !showForm && !success && (
        <div className="mt-6 rounded-lg border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Bought this product? Your review helps other shoppers decide.
          </p>
        </div>
      )}
    </div>
  );
}
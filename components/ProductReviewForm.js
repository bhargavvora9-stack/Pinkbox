'use client';
import { useState } from 'react';
import { Star } from 'lucide-react';

export default function ProductReviewForm({ productId }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setStatus(''); setSending(true);
    try {
      const r = await fetch('/api/storefront/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, rating, customer_name: name, review_text: text }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Unable to submit review.');
      setStatus(j.message || 'Thank you! Your review will appear once approved.');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (done) return <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">{status}</div>;

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-[#fff9fb] p-5">
      <b className="text-sm">Write a review</b>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} aria-label={`${n} star`}>
            <Star size={22} className="text-[#d9295f]" fill={n <= (hoverRating || rating) ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-3 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#d9295f]" required />
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share your experience with this product..." rows="3" className="mt-3 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#d9295f]" required />
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      <button disabled={sending} className="mt-3 rounded-full bg-[#d9295f] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{sending ? 'Submitting…' : 'Submit review'}</button>
    </form>
  );
}

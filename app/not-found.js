import Link from 'next/link';

export const metadata = { title: 'Page not found | PinkBox' };

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
        background: '#fffaf7',
        color: '#5b4546',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: '#fdeef1',
          color: '#d9295f',
          display: 'grid',
          placeItems: 'center',
          fontSize: 34,
          fontWeight: 900,
          fontFamily: 'Georgia, serif',
          marginBottom: 24,
        }}
      >
        PB
      </div>
      <h1
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(28px, 6vw, 44px)',
          fontWeight: 500,
          color: '#6a4b4e',
          margin: '0 0 12px',
        }}
      >
        This page took a detour
      </h1>
      <p style={{ maxWidth: 420, color: '#846f70', fontSize: 14, lineHeight: 1.7, margin: '0 0 28px' }}>
        We couldn&apos;t find the page you were looking for. It may have moved, or the link might be off by a little.
      </p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            padding: '13px 26px',
            borderRadius: 999,
            background: '#d8899d',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Back to homepage
        </Link>
        <Link
          href="/#collections"
          style={{
            padding: '13px 26px',
            borderRadius: 999,
            border: '1px solid #d9bcc0',
            color: '#70595b',
            fontWeight: 800,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Shop products
        </Link>
      </div>
    </main>
  );
}

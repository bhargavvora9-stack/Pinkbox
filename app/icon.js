import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#d9295f',
          borderRadius: 8,
          color: '#fff',
          fontSize: 18,
          fontWeight: 900,
          fontFamily: 'Georgia, serif',
        }}
      >
        PB
      </div>
    ),
    { ...size }
  );
}

export const metadata = {
  title: "PinkBox",
  description: "PinkBox Website",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

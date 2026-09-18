import './globals.css';

export const metadata = {
  title: 'Diary With You 📔',
  description: 'A shared memory book — our moments, forever.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

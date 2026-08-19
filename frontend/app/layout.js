import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Om Shivam Jewellers',
  description: 'Loan ledger',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#F7F5F0] text-[#292524]">
        <div className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Om Shivam Jewellers"
                className="h-11 w-auto object-contain"
              />
              <div>
                <p className="text-lg font-bold tracking-tight text-[#292524] leading-tight">
                  Om Shivam Jewellers
                </p>
                <p className="text-sm font-semibold text-[#B45309] leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                </p>
              </div>
            </Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
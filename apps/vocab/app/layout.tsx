import type { ReactNode } from "react";

export const metadata = {
  robots: { index: false },
  title: "Solid Mortgage Showcase residue vocabulary (mort)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

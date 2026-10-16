import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "JSR Race Intelligence",
  description:
    "Evidence-based sim racing video coaching. Analyze. Understand. Improve.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

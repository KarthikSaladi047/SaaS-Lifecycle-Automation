import "./globals.css";
import { ReactNode } from "react";
import { Providers } from "./components/Provider";

export const metadata = {
  title: "PCD Manager",
  description: "Created by Karthik Saladi",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import "./globals.css";
import { ReactNode } from "react";
import { Providers } from "./components/home/Provider";
import SessionTimeoutWrapper from "./components/layout/SessionTimeoutWrapper";

export const metadata = {
  title: "PCD Manager",
  description: "Created by Karthik Saladi",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>
        <Providers>
          <SessionTimeoutWrapper>{children}</SessionTimeoutWrapper>
        </Providers>
      </body>
    </html>
  );
}

import { type Metadata } from "next";
import "@mantine/core/styles.css";
import "./globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import { MantineProvider } from "@mantine/core";

export const metadata: Metadata = {
  title: "Adverse Media Screening",
  description: "Screen news articles for adverse media against a named individual.",
};

const RootLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element => {
  return (
    <html lang="en">
      <body>
        {/* Skip link — allows keyboard users to jump past navigation to main content */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <MantineProvider>
          <TRPCReactProvider>
            <main id="main-content">{children}</main>
          </TRPCReactProvider>
        </MantineProvider>
      </body>
    </html>
  );
};

export default RootLayout;

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "C-Studio Web | Browser-Based C Programming IDE",
  description:
    "A modern, sandboxed web-based IDE for C and pseudo-code algorithm translation. Compile, run, and debug C natively in your browser using WebAssembly.",
  applicationName: "C-Studio",
  keywords: [
    "C IDE",
    "WebAssembly",
    "Compiler",
    "Online Compiler",
    "Learn C",
    "C-Studio",
    "USDB Algorithm",
    "Web IDE",
    "Programming",
    "C Language",
  ],
  openGraph: {
    type: "website",
    url: "https://c-studio.dev",
    title: "C-Studio Web - Compile C in the Browser",
    description:
      "A sleek, dark-themed native C IDE that runs entirely in your browser. Translate algorithms to C and compile natively.",
    siteName: "C-Studio Web",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "C-Studio Web Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "C-Studio Web | Browser-Based C IDE",
    description:
      "Compile and debug C natively in your browser. Seamlessly translate USDB algorithms.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              imports: {
                "emception/": "/emception/",
              },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

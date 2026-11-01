import type { AppProps } from "next/app";
import { Figtree } from "next/font/google";
import "@beans/tokens/tokens.css";
import "@/marketing/base.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${figtree.variable} site`}>
      <Component {...pageProps} />
    </div>
  );
}

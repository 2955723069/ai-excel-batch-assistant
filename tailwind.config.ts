import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#68738a",
        line: "#e5e9f0",
        brand: "#3867e8",
      },
      boxShadow: {
        panel: "0 16px 45px rgba(35, 53, 90, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

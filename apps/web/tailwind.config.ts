import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        skyday: "#38BDF8",
        sunpop: "#FACC15",
        leaf: "#22C55E",
        berry: "#FB7185",
        ink: "#1F2937",
        cloud: "#F8FAFC",
      },
      borderRadius: {
        kid: "1.75rem",
        button: "1rem",
      },
      boxShadow: {
        kid: "0 18px 45px rgba(31, 41, 55, 0.16)",
      },
      borderWidth: {
        3: "3px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

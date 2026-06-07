import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Near-black surfaces
        bg: {
          DEFAULT: "#08090a",
          subtle: "#0c0d0f",
          raised: "#121316",
          overlay: "#16181c",
        },
        border: {
          DEFAULT: "#1f2125",
          subtle: "#191b1f",
          strong: "#2a2d33",
        },
        fg: {
          DEFAULT: "#e6e8eb",
          muted: "#9ba1a8",
          subtle: "#6b7178",
          faint: "#474c52",
        },
        // Electric blue accent ramp
        accent: {
          DEFAULT: "#3b82f6",
          bright: "#4f9bff",
          hover: "#1d6fff",
          muted: "#1e3a8a",
          soft: "#0f1d3d",
        },
        provider: {
          gmail: "#ea4335",
          outlook: "#0a84ff",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(59,130,246,0.4), 0 0 24px -4px rgba(59,130,246,0.35)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;

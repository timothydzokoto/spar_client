/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 8px 24px rgba(15, 23, 42, 0.18)",
      },
      colors: {
        felt: {
          700: "#1f6a4f",
          800: "#18513d",
          900: "#11372b",
        },
      },
    },
  },
  plugins: [],
};

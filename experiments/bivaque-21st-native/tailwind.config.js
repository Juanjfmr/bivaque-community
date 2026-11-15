export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{tsx,ts}"],
  theme: { extend: {
    colors: { background: "var(--background)", foreground: "var(--foreground)", card: "var(--card)", border: "var(--border)", primary: "var(--primary)", "primary-foreground": "var(--background)", secondary: "var(--secondary)", muted: "var(--muted)", accent: "var(--accent)", "muted-foreground": "var(--muted-foreground)", "card-foreground": "var(--foreground)", "secondary-foreground": "var(--foreground)", brasa: "var(--brasa)" },
    borderRadius: { xl: "16px", "2xl": "22px" },
  } }, plugins: [],
};

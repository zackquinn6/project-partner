import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === "development") {
    const fileEnv = loadEnv(mode, process.cwd(), "");
    const url =
      process.env.VITE_SUPABASE_URL?.trim() ||
      fileEnv.VITE_SUPABASE_URL?.trim();
    const key =
      process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      fileEnv.VITE_SUPABASE_ANON_KEY?.trim() ||
      fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!url || !key) {
      console.error(
        "\n[!] Missing Supabase environment variables for local dev.\n" +
          "    Copy .env.example to .env in the project root, then set:\n" +
          "    VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).\n"
      );
      process.exit(1);
    }
  }

  return {
    server: {
      // true: listen on all addresses; "::" can be flaky on some Windows setups vs localhost.
      host: true,
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL as NodeURL } from "node:url";
import { componentTagger } from "lovable-tagger";

const srcDir = fileURLToPath(new NodeURL("./src", import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
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
        "@": srcDir,
      },
    },
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react-vendor";
          if (id.includes("node_modules/@tanstack/")) return "tanstack-vendor";
          if (id.includes("node_modules/@supabase/")) return "supabase-vendor";
          if (id.includes("node_modules/@radix-ui/")) return "radix-vendor";
          if (id.includes("node_modules/lucide-react/")) return "icons-vendor";
          return undefined;
        },
      },
    },
  },
});

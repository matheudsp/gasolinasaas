import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  // development: .env, .env.local, .env.development, .env.development.local
  // production: .env, .env.local, .env.production, .env.production.local
  return {
    plugins: [
      
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      devtools(),
      tsconfigPaths(),
      tailwindcss(),
      tanstackStart({}),
      viteReact({
        // https://react.dev/learn/react-compiler
        babel: {
          plugins: [
            [
              "babel-plugin-react-compiler",
              {
                target: "19",
              },
            ],
          ],
        },
      }),
    ],
  };
});

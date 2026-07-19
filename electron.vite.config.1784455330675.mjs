// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        "@main": resolve("src/main")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@assets": resolve("src/renderer/src/assets")
      }
    },
    plugins: [react()]
  }
});
export {
  electron_vite_config_default as default
};

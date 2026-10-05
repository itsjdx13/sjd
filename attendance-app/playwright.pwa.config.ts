import {defineConfig} from "@playwright/test";
export default defineConfig({
  testDir:"./tests",testMatch:"pwa.spec.ts",workers:1,timeout:30000,outputDir:"test-results-pwa",
  use:{baseURL:"http://127.0.0.1:4180",channel:"msedge",serviceWorkers:"allow"},
  webServer:{command:"npx vite preview --host 127.0.0.1 --port 4180 --strictPort",url:"http://127.0.0.1:4180",reuseExistingServer:true}
});

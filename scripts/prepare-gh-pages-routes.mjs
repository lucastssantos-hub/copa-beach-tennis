import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
const routes = ["org", "capitao", "telao"];

copyFileSync(join(dist, "index.html"), join(dist, "404.html"));

for (const route of routes) {
  const routeDir = join(dist, route);
  mkdirSync(routeDir, { recursive: true });
  copyFileSync(join(dist, "index.html"), join(routeDir, "index.html"));
}

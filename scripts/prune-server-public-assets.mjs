import { existsSync, readdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const publicRoot = join(projectRoot, "public");
const serverRoot = join(projectRoot, "dist", "server");

function removeServerCopies(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) {
      removeServerCopies(source);
      continue;
    }
    const duplicate = join(serverRoot, relative(publicRoot, source));
    if (existsSync(duplicate)) rmSync(duplicate, { force: true });
  }
}

if (existsSync(publicRoot) && existsSync(serverRoot)) removeServerCopies(publicRoot);

// Remove empty directories left by nested public assets. The client copy remains
// the canonical static-asset directory used by the Sites/Cloudflare deployment.
for (const entry of readdirSync(serverRoot, { withFileTypes: true })) {
  const path = join(serverRoot, entry.name);
  if (entry.isDirectory() && entry.name === "models") rmSync(path, { recursive: true, force: true });
}

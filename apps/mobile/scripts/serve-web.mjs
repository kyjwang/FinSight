import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const distDir = join(process.cwd(), "dist");
const preferredPort = Number(process.env.PORT ?? 8081);
const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

if (!existsSync(join(distDir, "index.html"))) {
  console.error("Missing dist/index.html. Run `npm run web:export` first.");
  process.exit(1);
}

listen(preferredPort);

function listen(port) {
  const server = createServer(handleRequest);
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port < preferredPort + 10) {
      server.close();
      listen(port + 1);
      return;
    }

    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Serving FinSight web export at http://127.0.0.1:${port}`);
  });
}

async function handleRequest(request, response) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = normalize(join(distDir, pathname));
  const filePath = requestedPath.startsWith(distDir) ? requestedPath : join(distDir, "index.html");

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      streamFile(filePath, response);
      return;
    }
  } catch {
    // Fall through to the SPA fallback.
  }

  streamFile(join(distDir, "index.html"), response);
}

function streamFile(filePath, response) {
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
}

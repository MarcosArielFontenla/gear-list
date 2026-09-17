import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

let revision = 1;
const root = path.resolve("dist");
const types = { ".js": "application/javascript", ".css": "text/css", ".html": "text/html", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  let file = path.join(root, pathname);
  if (!file.startsWith(root)) { response.writeHead(403); response.end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
  let body = fs.readFileSync(file);
  if (pathname === "/sw.js") body = Buffer.from(body.toString().replace(/revision:"[^"]+"/, `revision:"test-${revision}"`));
  response.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
  response.end(body);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch();
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const url = `http://127.0.0.1:${server.address().port}/login`;
    await page.goto(url);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const email = page.getByLabel("Correo electrónico", { exact: true });
    await email.fill("draft@example.com");
    // Another tab may activate the worker, but must not erase this tab's draft.
    const other = await context.newPage();
    await other.goto(url);
    await other.waitForFunction(() => !!navigator.serviceWorker.controller);
    await other.waitForTimeout(500);
    let editingNavigations = 0;
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) editingNavigations++; });
    revision++;
    const reloaded = other.waitForEvent("framenavigated", { predicate: frame => frame === other.mainFrame(), timeout: 20000 });
    await other.evaluate(() => window.dispatchEvent(new Event("focus")));
    await reloaded;
    assert.equal(editingNavigations, 0);
    assert.equal(await email.inputValue(), "draft@example.com");
    const safeReload = page.waitForEvent("framenavigated", { predicate: frame => frame === page.mainFrame(), timeout: 20000 });
    await email.fill("");
    await safeReload;
    console.log(`${mobile ? "Mobile" : "Desktop"}: update applied automatically; draft survived activation from another tab.`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

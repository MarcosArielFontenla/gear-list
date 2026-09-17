import { expect, test } from "@playwright/test";

const picture = (color: string) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" rx="30" fill="#122335"/><path d="M140 225 Q400 110 660 225 L620 365 Q510 450 425 320 L375 320 Q290 450 180 365Z" fill="${color}" stroke="#b5cfe0" stroke-width="12"/><path d="M160 250 L50 280 M640 250 L750 280" stroke="#77899c" stroke-width="35"/><path d="M210 250 Q270 205 340 240 M460 240 Q530 205 590 250" fill="none" stroke="white" opacity=".25" stroke-width="12"/></svg>`);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD0kAAAAASUVORK5CYII=", "base64");

for (const mobile of [false, true]) {
  test(`galería, edición y reintento ${mobile ? "móvil" : "escritorio"}`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const list = { id: "list-1", name: "Protección", description: "Equipo personal", itemCount: 1, purchasedItemCount: 0, totalEstimated: 89000, updatedAt: "2026-09-17T12:00:00Z" };
    let item = { id: "item-1", gearListId: list.id, name: "Antiparras V2G PLUS", description: "Protección ocular con lentes intercambiables.", notes: "Incluye estuche y correa ajustable.", category: 3, priority: 1, status: 2, estimatedPrice: 89000, actualPrice: null, productUrl: "https://example.com", imageUrl: null, storeName: "TacticARG", position: 0, updatedAt: list.updatedAt, createdAt: list.updatedAt, purchasedAt: null, version: "v1", photoCount: 2 };
    let photos = [{ id: "photo-1", url: picture("#426c87"), thumbnailUrl: picture("#426c87"), width: 800, height: 600 },
      { id: "photo-2", url: picture("#c38148"), thumbnailUrl: picture("#c38148"), width: 800, height: 600 }];
    let writes = 0;
    let postedBody = "";
    await page.route("http://localhost:8080/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === "PUT" && path.endsWith("/with-photos")) {
        writes++;
        postedBody = route.request().postData() ?? "";
        expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
        if (writes === 1) return route.fulfill({ status: 503, contentType: "application/problem+json", body: JSON.stringify({ title: "La carga de fotos no está disponible en este momento." }) });
        item = { ...item, name: "Antiparras actualizadas", version: "v2", photoCount: 3 };
        photos = [{ id: "photo-3", url: picture("#617447"), thumbnailUrl: picture("#617447"), width: 800, height: 600 }, ...photos];
        return route.fulfill({ json: item });
      }
      if (path === "/api/health") return route.fulfill({ json: { status: "Healthy" } });
      if (path === "/api/auth/refresh") return route.fulfill({ json: { accessToken: "test", expiresAt: new Date(Date.now() + 600000).toISOString(), user: { id: "user-1", displayName: "Marcos", email: "test@example.com" } } });
      if (path.endsWith("/photos")) return route.fulfill({ json: photos });
      if (path.endsWith("/summary")) return route.fulfill({ json: { gearListId: list.id, itemCount: 1, pendingItemCount: 1, purchasedItemCount: 0, buyNowEstimated: 89000, actualSpent: 0 } });
      if (path.endsWith("/items")) return route.fulfill({ json: [item] });
      if (path.endsWith("/item-1")) return route.fulfill({ json: item });
      return route.fulfill({ json: list });
    });
    await page.goto("/lists/list-1");
    await page.getByRole("button", { name: "Antiparras V2G PLUS", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "Antiparras V2G PLUS", exact: true });
    await expect(dialog.getByText("Incluye estuche y correa ajustable.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Ver foto 2", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Ver foto 2", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Ver foto 2", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog).toHaveCSS("filter", "blur(0px)");
    await page.screenshot({ path: `test-results/product-detail-${mobile ? "mobile" : "desktop"}.png`, animations: "disabled" });
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(mobile ? 390 : 1400);
    await dialog.getByRole("button", { name: "Ampliar foto" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(2);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await dialog.getByRole("button", { name: "Editar producto" }).click();
    dialog = page.getByRole("dialog", { name: "Editar accesorio" });
    await expect(dialog.getByText("2/6")).toBeVisible();
    await dialog.getByLabel("Nombre", { exact: true }).fill("Antiparras actualizadas");
    await dialog.getByLabel("Seleccionar fotos").setInputFiles({ name: "new.png", mimeType: "image/png", buffer: png });
    await expect(dialog.getByText("3/6")).toBeVisible();
    await dialog.getByRole("button", { name: "Usar foto 3 como portada" }).click();
    await dialog.getByRole("button", { name: "Guardar accesorio" }).click();
    await expect(dialog.getByText("La carga de fotos no está disponible en este momento.")).toBeVisible();
    await expect(dialog.getByText("3/6")).toBeVisible();
    await expect(dialog.getByLabel("Nombre", { exact: true })).toHaveValue("Antiparras actualizadas");
    await dialog.getByRole("button", { name: "Guardar accesorio" }).click();
    await expect(dialog).not.toBeVisible();
    expect(postedBody).toContain('["new-0","photo-1","photo-2"]');
    expect(writes).toBe(2);
    await page.getByRole("button", { name: "Antiparras actualizadas", exact: true }).click();
    await expect(page.getByRole("button", { name: "Ver foto 3", exact: true })).toBeVisible();
  });
}

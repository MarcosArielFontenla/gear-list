import { expect, test } from "@playwright/test";

test("confirma eliminar, archivar y comprar sin diálogos del navegador", async ({ page }) => {
  const nativeDialogs: string[] = [];
  page.on("dialog", async (dialog) => { nativeDialogs.push(dialog.message()); await dialog.dismiss(); });
  const writes: string[] = [];
  const list = { id: "list-1", name: "Equipo de prueba", description: "Lista privada", itemCount: 1, purchasedItemCount: 0, totalEstimated: 100, updatedAt: "2026-07-29T12:00:00Z" };
  let items = [{ id: "item-1", gearListId: list.id, name: "Tico loader", category: 7, priority: 1, status: 1, estimatedPrice: 100, actualPrice: null, productUrl: null, imageUrl: null, storeName: null, position: 0, updatedAt: list.updatedAt, purchasedAt: null, version: "version-1" }];
  await page.route("http://localhost:8080/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === "DELETE") {
      writes.push(path);
      if (path.endsWith("/item-1")) items = [];
      await route.fulfill({ status: 204 });
    } else if (method === "POST" && path.endsWith("/items")) {
      writes.push(path);
      await route.fulfill({ status: 201, json: { id: "new-item", ...route.request().postDataJSON() } });
    } else if (path === "/api/health") await route.fulfill({ json: { status: "Healthy" } });
    else if (path === "/api/auth/refresh") await route.fulfill({ json: { accessToken: "test", expiresAt: new Date(Date.now() + 600000).toISOString(), user: { id: "user-1", displayName: "Marcos", email: "test@example.com" } } });
    else if (path === "/api/gear-lists") await route.fulfill({ json: [list] });
    else if (path.endsWith("/summary")) await route.fulfill({ json: { gearListId: list.id, itemCount: items.length, pendingItemCount: items.length, purchasedItemCount: 0, buyNowEstimated: 100, actualSpent: 0 } });
    else if (path.endsWith("/items")) await route.fulfill({ json: items });
    else await route.fulfill({ json: list });
  });

  await page.goto("/lists/list-1");
  const remove = page.getByRole("button", { name: "Eliminar Tico loader" });
  await remove.click();
  let dialog = page.getByRole("dialog", { name: "¿Eliminar accesorio?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await expect(dialog).toHaveCSS("filter", "blur(0px)");
  await page.screenshot({ animations: "disabled", path: "test-results/confirmation-desktop.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(writes).toEqual([]);
  await expect(remove).toBeFocused();
  await remove.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await expect(dialog).toHaveCSS("filter", "blur(0px)");
  await page.screenshot({ animations: "disabled", path: "test-results/confirmation-mobile-light.png" });
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await dialog.getByRole("button", { name: "Eliminar accesorio", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(page.getByText("Accesorio eliminado.")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo accesorio" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Protección ocular");
  await page.getByRole("combobox", { name: /^Estado/ }).selectOption("4");
  await page.getByLabel("Precio real", { exact: true }).fill("85");
  await page.getByRole("button", { name: "Guardar accesorio" }).click();
  dialog = page.getByRole("dialog", { name: "¿Confirmar compra?" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("dialog", { name: "Nuevo accesorio" })).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Protección ocular");
  expect(writes).toHaveLength(1);
  await page.getByRole("button", { name: "Guardar accesorio" }).click();
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/lists");
  const archive = page.getByRole("button", { name: "Archivar Equipo de prueba" });
  await archive.click();
  dialog = page.getByRole("dialog", { name: "¿Archivar lista?" });
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes).toHaveLength(2);
  await archive.click();
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes).toHaveLength(2);
  await archive.click();
  await dialog.getByRole("button", { name: "Archivar lista", exact: true }).click();
  await expect.poll(() => writes.length).toBe(3);
  expect(nativeDialogs).toEqual([]);
});

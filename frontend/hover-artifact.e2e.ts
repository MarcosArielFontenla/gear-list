import { expect, test, type Page } from "@playwright/test";

const lists = [
  {
    id: "list-1",
    name: "Indumentaria",
    description: "Todo lo relacionado a indumentaria y uniformes",
    itemCount: 3,
    purchasedItemCount: 0,
    totalEstimated: 331_144,
    updatedAt: "2026-07-29T12:00:00Z",
  },
  {
    id: "list-2",
    name: "Marcadoras Secundarias",
    description: "Todo lo relacionado a marcadoras secundarias vistas",
    itemCount: 1,
    purchasedItemCount: 0,
    totalEstimated: 120,
    updatedAt: "2026-07-29T12:00:00Z",
  },
  {
    id: "list-3",
    name: "Marcadoras Primarias",
    description: "Todas las marcadoras primarias en vista",
    itemCount: 0,
    purchasedItemCount: 0,
    totalEstimated: 0,
    updatedAt: "2026-07-29T12:00:00Z",
  },
];

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("hovering a list action does not repaint the previous card", async ({
  page,
}) => {
  await page.goto("/lists");
  await expect(page.getByRole("heading", { name: "Listas de equipo" }))
    .toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const cards = page.locator(".list-card");
  await expect(cards).toHaveCount(3);
  const previousCard = cards.nth(0);
  await expect(previousCard).toHaveCSS("backdrop-filter", "none");
  const beforeHover = await previousCard.screenshot({
    animations: "disabled",
  });

  await cards.nth(1).getByRole("link", { name: "Abrir" }).hover();
  await page.waitForTimeout(250);
  const afterHover = await previousCard.screenshot({
    animations: "disabled",
  });

  expect(afterHover.equals(beforeHover)).toBe(true);
});

test("hovering a recent list does not repaint the next-purchase card", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Listas actualizadas" }))
    .toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const nextPurchase = page.locator(".next-card");
  await expect(nextPurchase).toHaveCSS("backdrop-filter", "none");
  const beforeHover = await nextPurchase.screenshot({
    animations: "disabled",
  });

  await page.locator(".recent-row").nth(2).hover();
  await page.waitForTimeout(250);
  const afterHover = await nextPurchase.screenshot({
    animations: "disabled",
  });

  expect(afterHover.equals(beforeHover)).toBe(true);
});

test("a single recent list keeps a compact desktop width", async ({ page }) => {
  await page.unroute("http://localhost:8080/api/**");
  await mockApi(page, lists.slice(0, 1));
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Listas actualizadas" }))
    .toBeVisible();

  const panelBounds = await page.locator(".recent-panel").boundingBox();
  const cardBounds = await page.locator(".recent-row").boundingBox();

  expect(panelBounds).not.toBeNull();
  expect(cardBounds).not.toBeNull();
  expect(cardBounds!.width).toBeLessThan(panelBounds!.width * 0.5);
  expect(cardBounds!.height).toBeLessThan(180);
});

test("settings uses a balanced card grid and an accessible password dialog", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Configuración" }))
    .toBeVisible();

  const cards = page.locator(".settings-card");
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toHaveCSS("backdrop-filter", "none");
  await expect(cards.nth(1)).toHaveCSS("backdrop-filter", "none");
  await expect(cards.nth(2)).toHaveCSS("backdrop-filter", "none");
  await expect(cards.nth(3)).toHaveCSS("backdrop-filter", "none");
  const bounds = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }),
  );

  expect(bounds[0].width).toBeCloseTo(bounds[1].width, 0);
  expect(bounds[2].width).toBeCloseTo(bounds[3].width, 0);
  expect(bounds[0].height).toBeCloseTo(bounds[1].height, 0);
  expect(bounds[2].height).toBeCloseTo(bounds[3].height, 0);
  expect(bounds[0].y).toBe(bounds[1].y);
  expect(bounds[2].y).toBe(bounds[3].y);

  const applicationCard = cards.nth(2);
  const beforePasswordHover = await applicationCard.screenshot({
    animations: "disabled",
  });
  const changePasswordButton = page.getByRole(
    "button",
    { name: "Cambiar contraseña" },
  );
  await changePasswordButton.hover();
  await page.waitForTimeout(250);
  const afterPasswordHover = await applicationCard.screenshot({
    animations: "disabled",
  });
  expect(afterPasswordHover.equals(beforePasswordHover)).toBe(true);

  await page.getByRole("heading", { name: "Configuración" }).hover();
  await page.waitForTimeout(250);
  const beforeLogoutHover = await page.locator(".settings-grid").screenshot({
    animations: "disabled",
  });
  await page.locator(".logout-button").hover();
  await page.waitForTimeout(250);
  const afterLogoutHover = await page.locator(".settings-grid").screenshot({
    animations: "disabled",
  });
  expect(afterLogoutHover.equals(beforeLogoutHover)).toBe(true);

  await changePasswordButton.click();
  await expect(
    page.getByRole("dialog", { name: "Cambiar contraseña" }),
  ).toBeVisible();
  await expect(page.getByLabel("Contraseña actual")).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  const mobileBounds = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().x),
  );
  expect(new Set(mobileBounds.map(Math.round)).size).toBe(1);
});

async function mockApi(page: Page, recentLists = lists) {
  await page.route("http://localhost:8080/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/api/health") {
      await route.fulfill({ json: { status: "Healthy" } });
      return;
    }

    if (path === "/api/auth/refresh") {
      await route.fulfill({
        json: {
          accessToken: "playwright-access-token",
          expiresAt: "2099-01-01T00:00:00Z",
          user: {
            id: "user-1",
            displayName: "Marcos Fernández",
            email: "marcos@example.com",
          },
        },
      });
      return;
    }

    if (path === "/api/gear-lists") {
      await route.fulfill({ json: lists });
      return;
    }

    if (path === "/api/dashboard/summary") {
      await route.fulfill({
        json: {
          listCount: 3,
          pendingItemCount: 4,
          purchasedItemCount: 0,
          totalEstimated: 331_264,
          nextPurchase: {
            id: "item-1",
            gearListId: "list-2",
            gearListName: "Marcadoras Secundarias",
            name: "Beretta M92 GBB",
            category: 2,
            estimatedPrice: 120,
            storeName: "Arsenal",
          },
          recentLists,
        },
      });
      return;
    }

    await route.fulfill({
      contentType: "application/problem+json",
      json: { title: "Solicitud no contemplada por la prueba." },
      status: 404,
    });
  });
}

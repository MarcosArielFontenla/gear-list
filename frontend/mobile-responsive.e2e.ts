import { expect, test, type Page } from "@playwright/test";

const purchasedItems = Array.from({ length: 6 }, (_, index) => ({
  id: `purchase-${index + 1}`,
  gearListId: "list-1",
  gearListName: "Indumentaria táctica",
  name: `Accesorio táctico comprado ${index + 1}`,
  category: 4,
  estimatedPrice: 331_144 + index * 1_000,
  actualPrice: 1_249_999.99 + index * 2_500,
  difference: 918_855.99 + index * 1_500,
  purchasedAt: "2026-07-29T12:00:00Z",
  storeName: "Tactical Supply",
  productUrl: null,
}));

const gearItems = Array.from({ length: 16 }, (_, index) => ({
  id: `item-${index + 1}`,
  gearListId: "list-1",
  name: `Accesorio para verificar desplazamiento ${index + 1}`,
  category: 4,
  priority: (index % 4) + 1,
  status: 1,
  estimatedPrice: 331_144 + index * 120,
  actualPrice: null,
  productUrl: null,
  imageUrl: null,
  storeName: "Tactical Supply",
  position: Math.floor(index / 4),
  updatedAt: "2026-07-29T12:00:00Z",
  purchasedAt: null,
  version: `version-${index + 1}`,
}));

test.describe("responsive móvil", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("mantiene todos los importes dentro de cada compra", async ({ page }) => {
    await page.goto("/purchased");
    await expect(
      page.getByRole("heading", { name: "Historial de compras" }),
    ).toBeVisible();

    const cards = page.locator(".purchase-row");
    await expect(cards).toHaveCount(purchasedItems.length);

    for (const card of await cards.all()) {
      const metrics = await card.evaluate((element) => {
        const cardRect = element.getBoundingClientRect();
        const values = Array.from(element.querySelectorAll("dd"));
        const groups = Array.from(element.querySelectorAll("dl > div"));

        return {
          differenceStartsBelow:
            groups[2].getBoundingClientRect().top >
            groups[0].getBoundingClientRect().top,
          valuesStayInside: values.every((value) => {
            const rect = value.getBoundingClientRect();
            return (
              rect.left >= cardRect.left &&
              rect.right <= cardRect.right
            );
          }),
        };
      });

      expect(metrics.differenceStartsBelow).toBe(true);
      expect(metrics.valuesStayInside).toBe(true);
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("permite iniciar el scroll táctil sobre una card", async ({
    page,
  }) => {
    await page.goto("/lists/list-1");
    await expect(
      page.getByRole("heading", { name: "Indumentaria táctica" }),
    ).toBeVisible();

    const card = page.locator(".gear-card").first();
    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("touch-action", /pan-y/);

    const bounds = await card.boundingBox();
    expect(bounds).not.toBeNull();

    const session = await page.context().newCDPSession(page);
    const x = bounds!.x + Math.min(bounds!.width / 2, 120);
    const startY = Math.min(bounds!.y + bounds!.height / 2, 720);

    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: startY }],
    });
    for (let step = 1; step <= 5; step += 1) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: startY - step * 55 }],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });

    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(80);
  });
});

async function mockApi(page: Page) {
  await page.route("http://localhost:8080/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/api/health") {
      await route.fulfill({ json: { status: "Healthy" } });
      return;
    }

    if (path === "/api/auth/refresh") {
      await route.fulfill({
        json: {
          accessToken: "mobile-access-token",
          expiresAt: "2099-01-01T00:00:00Z",
          user: {
            id: "user-1",
            displayName: "Marcos Fernández",
            email: "marcos.fontenla@hotmail.com",
          },
        },
      });
      return;
    }

    if (path === "/api/dashboard/purchases") {
      await route.fulfill({ json: purchasedItems });
      return;
    }

    if (path === "/api/gear-lists/list-1") {
      await route.fulfill({
        json: {
          id: "list-1",
          name: "Indumentaria táctica",
          description: "Equipamiento de Marcos para pruebas móviles",
          createdAt: "2026-07-29T12:00:00Z",
          updatedAt: "2026-07-29T12:00:00Z",
        },
      });
      return;
    }

    if (path === "/api/gear-lists/list-1/items") {
      await route.fulfill({ json: gearItems });
      return;
    }

    if (path === "/api/gear-lists/list-1/summary") {
      await route.fulfill({
        json: {
          gearListId: "list-1",
          itemCount: gearItems.length,
          pendingItemCount: gearItems.length,
          purchasedItemCount: 0,
          totalEstimated: 5_300_000,
          buyNowEstimated: 1_325_000,
          actualSpent: 0,
          difference: -5_300_000,
          nextPurchase: null,
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

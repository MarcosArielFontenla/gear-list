import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:8080/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/api/auth/refresh") {
      await route.fulfill({
        contentType: "application/problem+json",
        json: { title: "Sin sesión." },
        status: 401,
      });
      return;
    }

    if (path === "/api/auth/forgot-password") {
      await route.fulfill({
        json: {
          message:
            "Si existe una cuenta con ese correo, recibirás un enlace.",
        },
        status: 202,
      });
      return;
    }

    if (path === "/api/auth/reset-password") {
      await route.fulfill({ body: "", status: 204 });
      return;
    }

    await route.fulfill({
      contentType: "application/problem+json",
      json: { title: "Solicitud no contemplada por la prueba." },
      status: 404,
    });
  });
});

test("requests a recovery email from the login screen", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", {
    name: "¿Olvidaste tu contraseña?",
  }).click();

  await expect(
    page.getByRole("heading", { name: "Recuperar contraseña" }),
  ).toBeVisible();
  await page.getByLabel("Correo electrónico").fill("marcos@example.com");
  await page.getByRole("button", { name: "Enviar enlace" }).click();

  await expect(
    page.getByRole("heading", { name: "Solicitud recibida" }),
  ).toBeVisible();
  await expect(page.getByText(/marcos@example.com/)).toBeVisible();
});

test("creates a new password without leaving the token in the URL", async ({
  page,
}) => {
  await page.goto(
    "/reset-password#userId=user-123&token=secure-token-456",
  );
  const password = page.getByLabel("Nueva contraseña");
  const confirmation = page.getByLabel("Confirmar contraseña");
  await password.fill("NuevaClave123");
  await confirmation.fill("NuevaClave123");
  await page.getByRole("checkbox", { name: "Ver contraseña" }).check();

  await expect(password).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("NuevaClave123");
  await expect(confirmation).toHaveValue("NuevaClave123");

  await page.getByRole("button", { name: "Guardar contraseña" }).click();

  await expect(
    page.getByRole("heading", { name: "Contraseña actualizada" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/reset-password$/);
});

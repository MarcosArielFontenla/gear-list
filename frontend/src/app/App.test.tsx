import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getAccessibilityViolations } from "../test/accessibility";
import { AppProviders } from "./providers/AppProviders";
import App from "./App";

describe("App authentication", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/login");
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          jsonResponse(
            {
              title:
                "El correo electrónico o la contraseña son incorrectos.",
            },
            401,
          ),
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates the login form before calling the API", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByText("Ingresa un email válido.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /^Correo electrónico/ }),
    ).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(document.title).toBe("Iniciar sesión · Gear List");
  });

  it("shows a clear API error for invalid credentials", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(
      screen.getByLabelText("Correo electrónico"),
      "user@example.com",
    );
    await user.type(screen.getByLabelText("Contraseña"), "WrongPass1");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(
      await screen.findByText(
        "El correo electrónico o la contraseña son incorrectos.",
      ),
    ).toBeInTheDocument();
  });

  it("shows and hides the login password without clearing it", async () => {
    const user = userEvent.setup();
    renderApp();
    const password = screen.getByLabelText("Contraseña");

    await user.type(password, "ClaveVisible123");

    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveValue("ClaveVisible123");

    await user.click(
      screen.getByRole("checkbox", { name: "Ver contraseña" }),
    );

    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("ClaveVisible123");

    await user.click(
      screen.getByRole("checkbox", { name: "Ver contraseña" }),
    );

    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveValue("ClaveVisible123");
  });

  it("switches the color theme", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(
      screen.getByRole("button", { name: "Cambiar al tema claro" }),
    );

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("has no detectable semantic accessibility violations on login", async () => {
    const { container } = renderApp();

    expect(
      await screen.findByRole("heading", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(await getAccessibilityViolations(container)).toEqual([]);
  });
});

function renderApp() {
  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

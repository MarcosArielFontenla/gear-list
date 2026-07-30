import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "../../../app/providers/AppProviders";
import App from "../../../app/App";
import { getAccessibilityViolations } from "../../../test/accessibility";

describe("Recuperación de contraseña", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("valida el correo y muestra una confirmación no enumerativa", async () => {
    window.history.pushState({}, "", "/forgot-password");
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderApp();

    await user.click(
      screen.getByRole("button", { name: "Enviar enlace" }),
    );
    expect(screen.getByText("Ingresa un email válido.")).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /^Correo electrónico/ }),
      "marcos@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "Enviar enlace" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Solicitud recibida" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/marcos@example.com/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/forgot-password",
      expect.objectContaining({ method: "POST" }),
    );
    expect(document.title).toBe("Recuperar contraseña · Gear List");
  });

  it("rechaza un enlace incompleto y permite solicitar otro", async () => {
    window.history.pushState({}, "", "/reset-password");
    vi.stubGlobal("fetch", createFetchMock());
    const { container } = renderApp();

    expect(
      await screen.findByRole("heading", {
        name: "Solicita un enlace nuevo",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Recuperar contraseña" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(await getAccessibilityViolations(container)).toEqual([]);
  });

  it("envía las credenciales del fragmento y limpia el enlace al terminar", async () => {
    window.history.pushState(
      {},
      "",
      "/reset-password#userId=user-123&token=token-456",
    );
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderApp();

    const password = screen.getByLabelText("Nueva contraseña");
    const confirmation = screen.getByLabelText("Confirmar contraseña");
    await user.type(password, "NuevaClave123");
    await user.type(confirmation, "NuevaClave123");
    await user.click(
      screen.getByRole("checkbox", { name: "Ver contraseña" }),
    );

    expect(password).toHaveAttribute("type", "text");
    expect(confirmation).toHaveAttribute("type", "text");
    expect(password).toHaveValue("NuevaClave123");
    expect(confirmation).toHaveValue("NuevaClave123");

    await user.click(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Contraseña actualizada",
      }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe("");

    const resetCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/api/auth/reset-password"),
    );
    expect(resetCall).toBeDefined();
    expect(JSON.parse(String(resetCall![1]?.body))).toEqual({
      userId: "user-123",
      token: "token-456",
      password: "NuevaClave123",
      confirmPassword: "NuevaClave123",
    });
  });

  it("muestra el error de un token vencido", async () => {
    window.history.pushState(
      {},
      "",
      "/reset-password#userId=user-123&token=expired",
    );
    const fetchMock = createFetchMock({ resetFails: true });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderApp();

    await user.type(
      screen.getByLabelText("Nueva contraseña"),
      "NuevaClave123",
    );
    await user.type(
      screen.getByLabelText("Confirmar contraseña"),
      "NuevaClave123",
    );
    await user.click(
      screen.getByRole("button", { name: "Guardar contraseña" }),
    );

    expect(
      await screen.findByText(
        "El enlace de recuperación no es válido o ya venció.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});

function renderApp() {
  return render(
    <AppProviders>
      <App />
    </AppProviders>,
  );
}

function createFetchMock(options: { resetFails?: boolean } = {}) {
  return vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/api/auth/refresh")) {
      return Promise.resolve(jsonResponse({ title: "Sin sesión." }, 401));
    }

    if (url.endsWith("/api/auth/forgot-password")) {
      return Promise.resolve(
        jsonResponse(
          {
            message:
              "Si existe una cuenta con ese correo, recibirás un enlace.",
          },
          202,
        ),
      );
    }

    if (url.endsWith("/api/auth/reset-password")) {
      return Promise.resolve(
        options.resetFails
          ? jsonResponse(
              {
                errors: {
                  InvalidToken: [
                    "El enlace de recuperación no es válido o ya venció.",
                  ],
                },
              },
              400,
            )
          : new Response(null, { status: 204 }),
      );
    }

    throw new Error(`Solicitud inesperada: ${url}`);
  });
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

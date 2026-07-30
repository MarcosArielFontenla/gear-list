import { render, screen } from "@testing-library/react";
import { SettingsPage } from "./SettingsPage";

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { displayName: "Alex Rivera", email: "alex@example.com" },
    logout: vi.fn(),
    isOfflineSession: true,
  }),
}));

vi.mock("../../../pwa/offline/NetworkProvider", () => ({
  useNetwork: () => ({
    isOnline: false,
    status: "offline",
    checkConnectivity: vi.fn(),
  }),
}));

vi.mock("../../../pwa/service-worker/PwaProvider", () => ({
  usePwa: () => ({
    canInstall: false,
    install: vi.fn(),
    isInstalled: false,
  }),
}));

describe("SettingsPage", () => {
  it("reflects the centralized offline state", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Sin conexión");
    expect(
      screen.getByRole("heading", { name: "Sin conexión" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sesión local activa/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Contraseña" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    ).toBeDisabled();
  });
});

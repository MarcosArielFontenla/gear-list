import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordForm } from "./ChangePasswordForm";

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../AuthProvider", () => ({
  useAuth: () => ({
    accessToken: "access-token",
    logout: mocks.logout,
  }),
}));

vi.mock("../api/authApi", () => ({
  changePassword: mocks.changePassword,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...original,
    useNavigate: () => mocks.navigate,
  };
});

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    mocks.changePassword.mockReset();
    mocks.logout.mockReset();
    mocks.navigate.mockReset();
  });

  it("updates the password, closes the local session and returns to login", async () => {
    const user = userEvent.setup();
    mocks.changePassword.mockResolvedValue(undefined);
    mocks.logout.mockResolvedValue(undefined);

    render(<ChangePasswordForm onClose={vi.fn()} />);

    const currentPassword = screen.getByLabelText("Contraseña actual");
    const newPassword = screen.getByLabelText("Nueva contraseña");
    const confirmation = screen.getByLabelText(
      "Confirmar nueva contraseña",
    );
    await user.type(currentPassword, "ValidPass123");
    await user.type(newPassword, "NewValidPass456");
    await user.type(confirmation, "NewValidPass456");
    await user.click(
      screen.getByRole("checkbox", { name: "Ver contraseña" }),
    );

    expect(currentPassword).toHaveAttribute("type", "text");
    expect(newPassword).toHaveAttribute("type", "text");
    expect(confirmation).toHaveAttribute("type", "text");
    expect(currentPassword).toHaveValue("ValidPass123");
    expect(newPassword).toHaveValue("NewValidPass456");
    expect(confirmation).toHaveValue("NewValidPass456");

    await user.click(
      screen.getByRole("button", { name: "Actualizar contraseña" }),
    );

    await waitFor(() => {
      expect(mocks.changePassword).toHaveBeenCalledWith(
        {
          currentPassword: "ValidPass123",
          newPassword: "NewValidPass456",
          confirmPassword: "NewValidPass456",
        },
        "access-token",
      );
    });
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.navigate).toHaveBeenCalledWith("/login", {
      replace: true,
      state: { passwordChanged: true },
    });
  });

  it("does not submit when the confirmation is different", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm onClose={vi.fn()} />);

    await user.type(
      screen.getByLabelText("Contraseña actual"),
      "ValidPass123",
    );
    await user.type(
      screen.getByLabelText("Nueva contraseña"),
      "NewValidPass456",
    );
    await user.type(
      screen.getByLabelText("Confirmar nueva contraseña"),
      "DifferentPass789",
    );
    await user.click(
      screen.getByRole("button", { name: "Actualizar contraseña" }),
    );

    expect(
      await screen.findByText("Las contraseñas no coinciden."),
    ).toBeInTheDocument();
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });
});

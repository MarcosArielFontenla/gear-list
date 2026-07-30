import { render, screen } from "@testing-library/react";
import { ApplicationErrorBoundary } from "./ApplicationErrorBoundary";

describe("ApplicationErrorBoundary", () => {
  it("replaces a broken render with a recoverable message", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ApplicationErrorBoundary>
        <BrokenView />
      </ApplicationErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", {
        name: "No pudimos mostrar la aplicación",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Recargar aplicación" }),
    ).toBeInTheDocument();

    consoleError.mockRestore();
  });
});

function BrokenView(): never {
  throw new Error("Broken render");
}

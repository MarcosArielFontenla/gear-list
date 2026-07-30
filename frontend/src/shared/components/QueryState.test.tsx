import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState, ErrorState, LoadingState } from "./QueryState";

describe("query states", () => {
  it("exposes loading progress to assistive technology", () => {
    render(<LoadingState label="Cargando accesorios..." />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("offers a keyboard-safe retry after an error", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<ErrorState message="Falló la consulta." onRetry={retry} />);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent("Falló la consulta.");
  });

  it("associates an empty region with its title", () => {
    render(
      <EmptyState
        description="Crea el primer registro."
        title="No hay resultados"
      />,
    );

    expect(
      screen.getByRole("region", { name: "No hay resultados" }),
    ).toBeInTheDocument();
  });
});

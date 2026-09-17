import { ConfirmProvider } from "../../../shared/components/ConfirmProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { GearItemForm } from "./GearItemForm";

const create = { mutateAsync: vi.fn(), isPending: false };
const update = { mutateAsync: vi.fn(), isPending: false };

vi.mock("../hooks/useGearItems", () => ({
  useGearItem: () => ({
    data: undefined,
    isPending: false,
    isError: false,
  }),
  useGearItemMutations: () => ({
    create,
    update,
    status: { mutateAsync: vi.fn() },
    remove: { mutateAsync: vi.fn() },
  }),
}));

vi.mock("../../../pwa/offline/NetworkProvider", () => ({
  useNetwork: () => ({ isOnline: true }),
}));

describe("GearItemForm", () => {
  beforeEach(() => {
    create.mutateAsync.mockReset().mockResolvedValue({});

  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an accessory and confirms a purchased status", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <GearItemForm listId="list-1" itemId={null} onClose={onClose} />,
      { wrapper: createWrapper() },
    );

    await user.type(screen.getByLabelText("Nombre"), "Protección ocular");
    await user.selectOptions(screen.getByLabelText("Estado"), "4");
    await user.type(screen.getByLabelText("Precio estimado"), "90");
    await user.type(screen.getByLabelText("Precio real"), "85");
    await user.click(
      screen.getByRole("button", { name: "Guardar accesorio" }),
    );

    expect(create.mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar compra" }));
    expect(create.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Protección ocular",
        status: 4,
        estimatedPrice: 90,
        actualPrice: 85,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </QueryClientProvider>
    );
  };
}

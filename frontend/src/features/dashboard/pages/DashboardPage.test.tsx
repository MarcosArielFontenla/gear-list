import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { displayName: "Alex Rivera", email: "alex@example.com" },
  }),
}));

vi.mock("../hooks/useDashboard", () => ({
  useDashboardSummary: () => ({
    isPending: false,
    isError: false,
    data: {
      listCount: 2,
      pendingItemCount: 5,
      purchasedItemCount: 3,
      totalEstimated: 493,
      nextPurchase: null,
      recentLists: [],
    },
  }),
}));

describe("DashboardPage", () => {
  it("renders the visual totals returned by the API", () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Hola, Alex." }),
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/493/)).toBeInTheDocument();
  });
});

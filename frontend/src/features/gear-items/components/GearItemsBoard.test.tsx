import { gearItemPreviewData } from "../gearItemPreviewData";
import { render, screen } from "@testing-library/react";
import { GearItemsBoard, reorderBoardItems } from "./GearItemsBoard";

describe("reorderBoardItems", () => {
  it("renders the four priorities without compressing their meaning", () => {
    render(<GearItemsBoard initialItems={gearItemPreviewData} />);

    expect(
      screen.getByRole("heading", { name: "Comprar ahora" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Comprar después" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Más adelante" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Algún día" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reordenar low-profile/i }),
    ).toBeInTheDocument();
  });

  it("reorders items inside the same priority", () => {
    const first = gearItemPreviewData[0];
    const second = gearItemPreviewData[1];

    const reordered = reorderBoardItems(
      gearItemPreviewData,
      second.id,
      first.id,
      1,
    );
    const buyNow = reordered.filter((item) => item.priority === 1);

    expect(buyNow.map((item) => item.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(buyNow.map((item) => item.position)).toEqual([0, 1]);
  });

  it("moves an item between priorities and normalizes both lanes", () => {
    const moving = gearItemPreviewData[0];
    const target = gearItemPreviewData[3];

    const reordered = reorderBoardItems(
      gearItemPreviewData,
      moving.id,
      target.id,
      2,
    );
    const buyNow = reordered.filter((item) => item.priority === 1);
    const buyNext = reordered.filter((item) => item.priority === 2);

    expect(buyNow.map((item) => item.position)).toEqual([0]);
    expect(buyNext.map((item) => item.id)).toEqual([
      gearItemPreviewData[2].id,
      moving.id,
      target.id,
    ]);
    expect(buyNext.map((item) => item.position)).toEqual([0, 1, 2]);
  });
});

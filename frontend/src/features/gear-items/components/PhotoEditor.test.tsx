import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { PhotoEditor } from "./PhotoEditor";
import type { PhotoDraft } from "../hooks/useGearItemPhotos";

function Editor() {
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  return <PhotoEditor photos={photos} onChange={setPhotos} disabled={false} />;
}
describe("PhotoEditor", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });
  it("selects several files, changes the cover, removes photos and frees previews", async () => {
    const user = userEvent.setup();
    const view = render(<Editor />);
    await user.upload(screen.getByLabelText("Seleccionar fotos"), [
      new File(["one"], "front.png", { type: "image/png" }),
      new File(["two"], "back.jpg", { type: "image/jpeg" }),
    ]);
    expect(screen.getByText("2/6")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Usar foto 2 como portada" }));
    expect(screen.getByRole("button", { name: "Foto 1, portada" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Quitar foto 2" }));
    expect(screen.getByText("1/6")).toBeInTheDocument();
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  it("rejects more than six images without replacing the selection", async () => {
    const user = userEvent.setup();
    render(<Editor />);
    await user.upload(screen.getByLabelText("Seleccionar fotos"), Array.from({ length: 7 }, (_, i) =>
      new File(["png"], `${i}.png`, { type: "image/png" })));
    expect(screen.getByRole("alert")).toHaveTextContent("hasta 6 fotos");
    expect(screen.getByText("0/6")).toBeInTheDocument();
  });
});

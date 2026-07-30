import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("traps focus, closes with Escape, and restores the trigger focus", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const trigger = screen.getByRole("button", { name: "Abrir modal" });
    await user.click(trigger);

    const close = screen.getByRole("button", { name: "Cerrar" });
    const save = screen.getByRole("button", { name: "Guardar" });

    await waitFor(() => expect(close).toHaveFocus());
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    save.focus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });
});

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)} type="button">
        Abrir modal
      </button>
      {isOpen && (
        <Modal
          description="Descripción accesible."
          onClose={() => setIsOpen(false)}
          title="Editar elemento"
        >
          <button type="button">Guardar</button>
        </Modal>
      )}
    </>
  );
}

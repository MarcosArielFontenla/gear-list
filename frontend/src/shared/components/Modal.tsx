import { useRef, type PropsWithChildren } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./animate-ui/dialog";

type ModalProps = PropsWithChildren<{
  title: string;
  description?: string;
  onClose: () => void;
}>;

export function Modal({ title, description, onClose, children }: ModalProps) {
  const trigger = useRef(document.activeElement as HTMLElement | null);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="form-dialog"
        {...(!description ? { "aria-describedby": undefined } : {})}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (trigger.current?.isConnected) trigger.current.focus();
        }}
      >
        <DialogHeader className="modal-header">
          <div>
            <p className="eyebrow">Gear List</p>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

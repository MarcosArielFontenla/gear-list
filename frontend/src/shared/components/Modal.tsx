import { useUpdateBlocker } from "../../pwa/service-worker/updateBlocker";
import { useRef, type KeyboardEventHandler, type PropsWithChildren } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./animate-ui/dialog";

type ModalProps = PropsWithChildren<{
  title: string;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  description?: string;
  onClose: () => void;
}>;

export function Modal({ title, description, onClose, children, className = "", onKeyDown }: ModalProps) {
  useUpdateBlocker();
  const trigger = useRef(document.activeElement as HTMLElement | null);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        onKeyDown={onKeyDown}
        className={`form-dialog ${className}`}
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

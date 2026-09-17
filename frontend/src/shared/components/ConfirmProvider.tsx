import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Archive, CheckCheck, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./animate-ui/dialog";

type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  intent: "delete" | "archive" | "purchase";
};
type Confirm = (options: Confirmation) => Promise<boolean>;
const ConfirmContext = createContext<Confirm | null>(null);
const icons = { delete: Trash2, archive: Archive, purchase: CheckCheck };

export function ConfirmProvider({ children }: PropsWithChildren) {
  const [options, setOptions] = useState<Confirmation | null>(null);
  const [open, setOpen] = useState(false);
  const pending = useRef<((confirmed: boolean) => void) | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<Confirm>((next) => {
    pending.current?.(false);
    trigger.current = document.activeElement as HTMLElement | null;
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => { pending.current = resolve; });
  }, []);

  const finish = (confirmed: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setOpen(false);
    resolve?.(confirmed);
  };

  useEffect(() => () => { pending.current?.(false); }, []);
  const Icon = options ? icons[options.intent] : Trash2;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(next) => { if (!next) finish(false); }}>
        <DialogContent
          className={`confirmation-dialog confirmation-${options?.intent ?? "delete"}`}
          onOpenAutoFocus={(event) => { event.preventDefault(); cancelButton.current?.focus(); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger.current?.isConnected) trigger.current.focus();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <span className="confirmation-icon" aria-hidden="true"><Icon /></span>
          <DialogHeader>
            <DialogTitle>{options?.title}</DialogTitle>
            <DialogDescription>{options?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="form-actions">
            <button ref={cancelButton} className="button button-secondary" onClick={() => finish(false)} type="button">Cancelar</button>
            <button className={`button ${options?.intent === "delete" ? "button-danger" : "button-primary"}`} onClick={() => finish(true)} type="button">{options?.confirmLabel}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider.");
  return confirm;
}

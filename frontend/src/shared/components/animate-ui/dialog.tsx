// Animate UI Radix Dialog, styled for Gear List.
// https://animate-ui.com/docs/components/radix/dialog
import { X } from "lucide-react";
import * as Primitive from "./dialog-primitives";

export const Dialog = Primitive.Dialog;
export const DialogTitle = Primitive.DialogTitle;
export const DialogDescription = Primitive.DialogDescription;
export const DialogHeader = Primitive.DialogHeader;
export const DialogFooter = Primitive.DialogFooter;

export function DialogContent({ children, className = "", ...props }: Primitive.DialogContentProps) {
  return (
    <Primitive.DialogPortal>
      <Primitive.DialogOverlay className="animated-dialog-overlay" />
      <Primitive.DialogContent className={`animated-dialog-content ${className}`} {...props}>
        <Primitive.DialogClose className="icon-button animated-dialog-close" aria-label="Cerrar">
          <X aria-hidden="true" />
        </Primitive.DialogClose>
        {children}
      </Primitive.DialogContent>
    </Primitive.DialogPortal>
  );
}

import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  /** Called on Cancel, on Escape, and when the dialog is dismissed. */
  onCancel: () => void
}

// Modal dialog that replaces window.confirm. The parent controls it with `open`.
export function ConfirmDialog({
  open,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog"
      onCancel={(event) => {
        // Escape would close the dialog by itself. Prevent that so the parent stays in charge of `open`.
        event.preventDefault()
        onCancel()
      }}
    >
      <p>{message}</p>
      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}

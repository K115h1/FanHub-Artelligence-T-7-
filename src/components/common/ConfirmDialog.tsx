
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom"

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    body?: string;
    confirmText?: string;
    cancelText?: string;
    isWarning?: boolean;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;

}

export function ConfirmDialog({
    isOpen,
    title,
    body,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isWarning = false,
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps
) {
    const confirmBtnref = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        confirmBtnref.current?.focus();
        const handlekeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isLoading) {
                onCancel();
            }
        };
        document.addEventListener("keydown", handlekeyDown);
        return () => {
            document.removeEventListener("keydown", handlekeyDown);
        };
    }, [isOpen, isLoading, onCancel]

    );

    if (!isOpen) return null;


    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 "
            onClick={() => !isLoading && onCancel()}        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby={body ? "confirm-dialog-desc" : undefined}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl border border-purple-500/40 bg-gradient-to-b from-purple-950 to-purple-900 p-6 text-purple-50 shadow-xl">
                <h2 id="confirm-dialog-title" className="text-lg font-semibold">
                    {title}
                </h2>
                {body && (
                    <p id="confirm-dialog-desc" className="mt-2 text-sm text-purple-300">
                        {body}
                    </p>
                )}
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="rounded-full border border-purple-900 px-4 py-2 text-sm font-medium text-purple-200 transition hover:border-purple-400 disabled:opacity-50"
                    >
                        {cancelText}

                    </button>
                    <button
                        ref={confirmBtnref}
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${isWarning
                                ? "bg-red-600 hover:bg-red-500"
                                : "bg-purple-500 hover:bg-purple-400"
                            }`}
                    >
                        {isLoading ? "Please wait…" : confirmText}


                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
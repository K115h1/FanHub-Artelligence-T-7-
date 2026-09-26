import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    body?: string;
    actionText?: string;
    onAction?: () => void;
}

export function EmptyState({
    icon: Icon,
    title,
    body,
    actionText,
    onAction,

}: EmptyStateProps) {
    return (
        <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-purple-500/40  px-6 py-14  bg-linear-0 from-purple-950 to-purple-900  text-center">
            {Icon && (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/30 text-purple-300">
                    <Icon className="h-6 w-6" strokeWidth={2} />

                </div>
            )}
            <h3 className="text-base font-semibold text-purple-50">{title}</h3>
            {body && <p className="max-w-xs text-sm text-purple-300">{body}</p>}
            {actionText && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="rounded-full bg-purple-500 hover:bg-purple-400 px-5 py-2 text-sm font-semibold text-white transition "
                >
                    {actionText}
                </button>
            )

            }
        </div>
    );
}
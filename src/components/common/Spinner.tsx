
import { LoaderCircle } from "lucide-react";

interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    label?: string;
}

const SIZE_CLASSES = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
};

export function Spinner({
    size = "md",
    label = "Loading",
}: SpinnerProps) {
    return (
        <div
            className="flex items-center justify-center"
            role="status"
            aria-label={label}
        >
            <LoaderCircle
                className={`${SIZE_CLASSES[size]} animate-spin text-purple-300`}
            />
            <span className="sr-only">{label}</span>
        </div>
    );
}


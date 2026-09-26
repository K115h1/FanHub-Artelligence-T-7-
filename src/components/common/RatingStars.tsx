import { Star } from "lucide-react";

interface RatingStarsProps {
    value?: number;
    onChange?: (rating: number) => void;
    disabled?: boolean;
}

export function RatingStars({
    value = 0,
    onChange,
    disabled = false,
}: RatingStarsProps) {
    function handleRating(nextRating: number) {
        if (disabled) return;
        onChange?.(nextRating);
    }

    return (
        <div className="flex items-center gap-1" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    aria-pressed={value === star}
                    disabled={disabled}
                    onClick={() => handleRating(star)}
                    className="rounded p-0.5 text-purple-400/60 transition hover:scale-110 hover:text-purple-400 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Star
                        className={`h-5 w-5 ${star <= value ? "text-purple-500" : ""
                            }`}
                        fill={star <= value ? "currentColor" : "none"}
                    />
                </button>
            ))}
        </div>
    );
}
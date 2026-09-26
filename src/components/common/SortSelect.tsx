
interface SortSelectProps {
    value?: string;
    onChange: (value: string) => void;
}

const SORT_OPTIONS = [
    { value: "latest", label: "Latest" },
    { value: "popular", label: "Most popular" },
    { value: "alphabetical", label: "Alphabetical" },
];

export function SortSelect({
    value = "latest",
    onChange,
}: SortSelectProps) {
    return (
        <div className="flex flex-col gap-1">
            <label
                htmlFor="sort-select"
                className="text-xs font-medium text-purple-300"
            >
                Sort by
            </label>

            <select
                id="sort-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-lg border border-purple-500/40 bg-linear-0 from-purple-950 to-purple-900 px-3 py-2 text-sm text-purple-50 outline-none transition focus:border-purple-400"
            >
                {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}


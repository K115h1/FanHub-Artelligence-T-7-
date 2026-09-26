import { useSearchParams } from "react-router-dom";

const CATEGORIES = ["Anime", "Gaming", "Movies", "TV Shows", "K-Pop", "Comics", "Manga", "Cosplay"];
const CONTENT_TYPES = ["Article", "Video", "Audio", "Image"];
const POPULARITY = ["Trending", "Most popular", "Underrated"];
const YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

interface FilterFieldProps {
    label: string;
    value: string;
    options: string[];
    paramKey: string;
    onChange: (paramKey: string, value: string) => void;
}

function FilterField({ label, value, options, paramKey, onChange }: FilterFieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-purple-300">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(paramKey, e.target.value)}
                className="rounded-lg border border-purple-500/40 bg-purple-950 px-3 py-2 text-sm text-purple-50 transition focus:border-purple-400 focus:outline-none"
            >
                <option value="">All</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        </div>
    );
}

export function FilterPanel() {
    const [searchParams, setSearchParams] = useSearchParams();

    const category = searchParams.get("category") ?? "";
    const genre = searchParams.get("genre") ?? "";
    const year = searchParams.get("year") ?? "";
    const contentType = searchParams.get("type") ?? "";
    const popularity = searchParams.get("popularity") ?? "";

    function handleChange(key: string, value: string) {
        const next = new URLSearchParams(searchParams);
        if (value) {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        setSearchParams(next);
    }

    function handleReset() {
        setSearchParams(new URLSearchParams());
    }

    const hasActiveFilters = Boolean(category || genre || year || contentType || popularity);

    return (
        <div className="flex w-full flex-col gap-4 rounded-xl border border-purple-500/40 bg-gradient-to-b from-purple-950 to-purple-900 p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <FilterField label="Category" value={category} options={CATEGORIES} paramKey="category" onChange={handleChange} />
                <FilterField label="Genre" value={genre} options={["Action", "Comedy", "Drama", "Horror", "Romance", "Slice of life"]} paramKey="genre" onChange={handleChange} />
                <FilterField label="Release year" value={year} options={YEARS} paramKey="year" onChange={handleChange} />
                <FilterField label="Content type" value={contentType} options={CONTENT_TYPES} paramKey="type" onChange={handleChange} />
                <FilterField label="Popularity" value={popularity} options={POPULARITY} paramKey="popularity" onChange={handleChange} />
            </div>

            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={handleReset}
                    className="self-start rounded-full bg-purple-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-400"
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}

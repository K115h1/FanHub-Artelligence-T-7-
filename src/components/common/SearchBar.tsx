import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";

interface SearchBarProps {
    value?: string;
    onSearch: (query: string) => void;
    placeholder?: string;
}

export function SearchBar({
    value = "",
    onSearch,
    placeholder = "Search...",
}: SearchBarProps) {
    const [query, setQuery] = useState(value);
    const debouncedQuery = useDebounce(query, 300);

    const onSearchRef = useRef(onSearch);

    useEffect(() => {
        onSearchRef.current = onSearch;
    }, [onSearch]);

    useEffect(() => {
        onSearchRef.current(debouncedQuery.trim());
    }, [debouncedQuery]);

    function handleClear() {
        setQuery("");
    }

    return (
        <div className="relative w-full">
            <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-400"
                aria-hidden="true"
            />

            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                aria-label="Search"
                className="w-full rounded-xl border border-purple-500/40 bg-linear-0 from-purple-950 to-purple-900 py-3 pl-10 pr-10 text-sm text-purple-50 outline-none placeholder:text-purple-400/50 transition focus:border-purple-400"
            />

            {query && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-purple-400 transition hover:bg-purple-500/20 hover:text-purple-100"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}


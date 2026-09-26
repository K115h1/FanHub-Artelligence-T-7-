import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== "undefined") {
            return window.matchMedia(query).matches;
        }

        return false;
    });

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia(query);

        setMatches(mediaQuery.matches);

        const handleChange = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, [query]);

    return matches;
}


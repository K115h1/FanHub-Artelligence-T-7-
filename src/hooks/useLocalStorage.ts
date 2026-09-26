import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === "undefined") {
            return initialValue;
        }

        try {
            const storedValue = localStorage.getItem(key);

            return storedValue !== null
                ? (JSON.parse(storedValue) as T)
                : initialValue;
        } catch {
            return initialValue;
        }
    });

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, value]);

    return [value, setValue];
}


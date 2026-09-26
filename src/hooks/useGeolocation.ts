
import { useCallback, useState } from "react";

interface Coordinates {
    latitude: number;
    longitude: number;
}

type GeolocationError =
    | "permission-denied"
    | "position-unavailable"
    | "timeout"
    | "unsupported"
    | null;

interface UseGeolocationReturn {
    coordinates: Coordinates | null;
    error: GeolocationError;
    loading: boolean;
    requestLocation: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [error, setError] = useState<GeolocationError>(null);
    const [loading, setLoading] = useState(false);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError("unsupported");
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoordinates({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setLoading(false);
            },
            (positionError) => {
                setLoading(false);

                switch (positionError.code) {
                    case positionError.PERMISSION_DENIED:
                        setError("permission-denied");
                        break;

                    case positionError.POSITION_UNAVAILABLE:
                        setError("position-unavailable");
                        break;

                    case positionError.TIMEOUT:
                        setError("timeout");
                        break;

                    default:
                        setError("position-unavailable");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, []);

    return {
        coordinates,
        error,
        loading,
        requestLocation,
    };
}


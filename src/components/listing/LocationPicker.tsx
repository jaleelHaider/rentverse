import React from "react";
import { MapPin, Navigation, Globe, Clock, Loader2 } from "lucide-react";

interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  radius: number;
}

interface LocationPickerProps {
  value?: Location;
  onChange?: (location: Location) => void;
  showRadius?: boolean;
}

const defaultLocation: Location = {
  address: "",
  city: "",
  state: "",
  country: "",
  lat: 0,
  lng: 0,
  radius: 5,
};

const radiusOptions = [1, 3, 5, 10, 25];

const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  showRadius = true,
}) => {
  const [isLocating, setIsLocating] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);

  const currentLocation = value ?? defaultLocation;

  const emitChange = (updates: Partial<Location>) => {
    onChange?.({ ...currentLocation, ...updates });
  };

  const handleFieldChange =
    (field: keyof Location) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      if (field === "lat" || field === "lng" || field === "radius") {
        const parsed = Number.parseFloat(nextValue);
        emitChange({ [field]: Number.isFinite(parsed) ? parsed : 0 } as Partial<Location>);
        return;
      }

      emitChange({ [field]: nextValue } as Partial<Location>);
    };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        display_name?: string;
        address?: {
          city?: string;
          town?: string;
          village?: string;
          state?: string;
          country?: string;
          suburb?: string;
          neighbourhood?: string;
          road?: string;
        };
      };

      return {
        address:
          data.display_name ||
          [data.address?.road, data.address?.suburb || data.address?.neighbourhood]
            .filter(Boolean)
            .join(", "),
        city: data.address?.city || data.address?.town || data.address?.village || "",
        state: data.address?.state || "",
        country: data.address?.country || "",
      };
    } catch {
      return null;
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoError(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const resolved = await reverseGeocode(lat, lng);

        emitChange({
          lat,
          lng,
          address: resolved?.address || currentLocation.address,
          city: resolved?.city || currentLocation.city,
          state: resolved?.state || currentLocation.state,
          country: resolved?.country || currentLocation.country,
        });

        setIsLocating(false);
      },
      (error) => {
        setGeoError(error.message || "Unable to read your current location.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Location</h3>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 text-blue-600" />}
          {isLocating ? "Detecting..." : "Use Current Location"}
        </button>
      </div>

      {geoError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {geoError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            value={currentLocation.address}
            onChange={handleFieldChange("address")}
            placeholder="House/Street/Area"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">City</label>
          <input
            type="text"
            value={currentLocation.city}
            onChange={handleFieldChange("city")}
            placeholder="City"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">State / Province</label>
          <input
            type="text"
            value={currentLocation.state}
            onChange={handleFieldChange("state")}
            placeholder="State / Province"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Country</label>
          <input
            type="text"
            value={currentLocation.country}
            onChange={handleFieldChange("country")}
            placeholder="Country"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Latitude</label>
            <input
              type="number"
              value={currentLocation.lat || ""}
              onChange={handleFieldChange("lat")}
              placeholder="0.000000"
              className="input-field"
              step="0.000001"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Longitude</label>
            <input
              type="number"
              value={currentLocation.lng || ""}
              onChange={handleFieldChange("lng")}
              placeholder="0.000000"
              className="input-field"
              step="0.000001"
            />
          </div>
        </div>
      </div>

      {showRadius ? (
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Globe className="h-4 w-4 text-gray-500" />
            Service Radius
          </div>
          <div className="grid grid-cols-5 gap-2">
            {radiusOptions.map((radiusKm) => (
              <button
                key={radiusKm}
                type="button"
                onClick={() => emitChange({ radius: radiusKm })}
                className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                  currentLocation.radius === radiusKm
                    ? "border-blue-500 bg-blue-50 font-semibold text-blue-700"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                {radiusKm} km
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            Renters inside {currentLocation.radius || 0} km can discover this listing first.
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <div className="mb-1 flex items-center gap-2 font-medium">
          <MapPin className="h-4 w-4" />
          Location Privacy
        </div>
        Exact address is shared only after booking confirmation.
      </div>
    </div>
  );
};

export default LocationPicker;

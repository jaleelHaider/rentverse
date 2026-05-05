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
  country: "Pakistan",
  lat: 0,
  lng: 0,
  radius: 5,
};

const radiusOptions = [1, 3, 5, 10, 25];

const pakistanProvinces = [
  "Azad Jammu and Kashmir",
  "Balochistan",
  "Gilgit-Baltistan",
  "Islamabad Capital Territory",
  "Khyber Pakhtunkhwa",
  "Punjab",
  "Sindh",
].sort((left, right) => left.localeCompare(right));

const pakistanCitiesByProvince: Record<string, string[]> = {
  "Azad Jammu and Kashmir": [
    "Bagh",
    "Bhimber",
    "Hattian Bala",
    "Kotli",
    "Mirpur",
    "Muzaffarabad",
    "Neelum",
    "Rawalakot",
  ].sort((left, right) => left.localeCompare(right)),
  Balochistan: [
    "Chaman",
    "Dera Murad Jamali",
    "Gwadar",
    "Hub",
    "Kharan",
    "Khuzdar",
    "Loralai",
    "Mastung",
    "Nushki",
    "Pasni",
    "Pishin",
    "Quetta",
    "Sibi",
    "Turbat",
    "Zhob",
  ].sort((left, right) => left.localeCompare(right)),
  "Gilgit-Baltistan": [
    "Astore",
    "Diamer",
    "Ghanche",
    "Ghizer",
    "Gilgit",
    "Hunza",
    "Khaplu",
    "Nagar",
    "Skardu",
  ].sort((left, right) => left.localeCompare(right)),
  "Islamabad Capital Territory": ["Islamabad"],
  "Khyber Pakhtunkhwa": [
    "Abbottabad",
    "Bannu",
    "Charsadda",
    "Chitral",
    "Dera Ismail Khan",
    "Haripur",
    "Karak",
    "Kohat",
    "Lakki Marwat",
    "Lower Dir",
    "Mansehra",
    "Mardan",
    "Mingora",
    "Nowshera",
    "Peshawar",
    "Swabi",
    "Swat",
    "Tank",
    "Torghar",
    "Upper Dir",
  ].sort((left, right) => left.localeCompare(right)),
  Punjab: [
    "Ahmedpur East",
    "Attock",
    "Bahawalnagar",
    "Bahawalpur",
    "Bhakkar",
    "Chakwal",
    "Chiniot",
    "Dera Ghazi Khan",
    "Faisalabad",
    "Gujranwala",
    "Gujrat",
    "Hafizabad",
    "Jahanian",
    "Jhelum",
    "Khanewal",
    "Kasur",
    "Lahore",
    "Layyah",
    "Lodhran",
    "Mianwali",
    "Multan",
    "Muzaffargarh",
    "Narowal",
    "Okara",
    "Pakpattan",
    "Rahim Yar Khan",
    "Rawalpindi",
    "Sahiwal",
    "Sargodha",
    "Sheikhupura",
    "Sialkot",
    "Toba Tek Singh",
    "Vehari",
    "Wazirabad",
  ].sort((left, right) => left.localeCompare(right)),
  Sindh: [
    "Badin",
    "Dadu",
    "Ghotki",
    "Hyderabad",
    "Jacobabad",
    "Jamshoro",
    "Karachi",
    "Kashmore",
    "Khairpur",
    "Kambar Shahdadkot",
    "Larkana",
    "Matiari",
    "Mirpur Khas",
    "Nawabshah",
    "Sanghar",
    "Shikarpur",
    "Sukkur",
    "Tando Adam",
    "Tando Allahyar",
    "Thatta",
    "Umerkot",
  ].sort((left, right) => left.localeCompare(right)),
};

const getCitiesForProvince = (province: string): string[] => pakistanCitiesByProvince[province] || [];


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
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const nextValue = event.target.value;
      if (field === "lat" || field === "lng" || field === "radius") {
        const parsed = Number.parseFloat(nextValue);
        emitChange({ [field]: Number.isFinite(parsed) ? parsed : 0 } as Partial<Location>);
        return;
      }

      if (field === "state") {
        const allowedCities = getCitiesForProvince(nextValue);
        emitChange({
          state: nextValue,
          city: allowedCities.includes(currentLocation.city) ? currentLocation.city : "",
        } as Partial<Location>);
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
          <label className="mb-2 block text-sm font-medium text-gray-700">State / Province</label>
          <select
            value={currentLocation.state}
            onChange={handleFieldChange("state")}
            className="input-field"
          >
            <option value="">Select state / province</option>
            {pakistanProvinces.map((provinceName) => (
              <option key={provinceName} value={provinceName}>
                {provinceName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">City</label>
          <select
            value={currentLocation.city}
            onChange={handleFieldChange("city")}
            className="input-field"
            disabled={!currentLocation.state}
          >
            <option value="">{currentLocation.state ? "Select city" : "Select province first"}</option>
            {getCitiesForProvince(currentLocation.state).map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>
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


interface ReverseGeocodeResponse {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
  };
}

function formatLocationAddress(result: ReverseGeocodeResponse) {
  const address = result.address;
  const street = [address?.house_number, address?.road]
    .filter(Boolean)
    .join(" ");
  const city = address?.city || address?.town || address?.village;
  const parts = [
    street,
    address?.neighbourhood || address?.suburb,
    city,
    address?.county,
    address?.state,
  ]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, values) => values.indexOf(part) === index);

  return parts.join(", ") || result.display_name?.trim() || "";
}

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
) {
  const query = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "18",
    addressdetails: "1",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${query.toString()}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(`Address lookup failed with status ${response.status}.`);
  }

  const result = (await response.json()) as ReverseGeocodeResponse;
  const address = formatLocationAddress(result);

  if (!address) {
    throw new Error("No address was returned for the current location.");
  }

  return address;
}

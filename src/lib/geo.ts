export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "es" } },
    );
    if (!res.ok) return "";
    const data = await res.json();
    return (
      data.display_name?.split(",").slice(0, 3).join(", ") ?? ""
    );
  } catch {
    return "";
  }
}
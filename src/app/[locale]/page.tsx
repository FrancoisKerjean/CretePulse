import { fetchAllCitiesWeather } from "@/lib/weather";
import { HomeClient } from "@/components/home/HomeClient";

export default async function HomePage() {
  const cities = await fetchAllCitiesWeather();
  return <HomeClient cities={cities} />;
}

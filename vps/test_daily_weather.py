import daily_weather as dw


def test_build_weather_block_maps_fields():
    cities = [{"name": "Heraklion"}, {"name": "Ierapetra"}]
    forecast = [
        {"daily": {"temperature_2m_max": [27.0], "temperature_2m_min": [19.0],
                   "precipitation_sum": [0.0], "wind_speed_10m_max": [22.0],
                   "uv_index_max": [8.0], "weather_code": [1]}},
        {"daily": {"temperature_2m_max": [30.0], "temperature_2m_min": [21.0],
                   "precipitation_sum": [1.2], "wind_speed_10m_max": [35.0],
                   "uv_index_max": [9.0], "weather_code": [80]}},
    ]
    marine = [
        {"current": {"sea_surface_temperature": 22.5}, "daily": {"wave_height_max": [0.6]}},
        {"current": {"sea_surface_temperature": 23.1}, "daily": {"wave_height_max": [1.4]}},
    ]
    block = dw.build_weather_block(forecast, marine, cities)
    assert len(block) == 2
    assert block[0]["city"] == "Heraklion"
    assert block[0]["tmax"] == 27.0
    assert block[0]["sky"] == "mainly clear"
    assert block[0]["sea_temp"] == 22.5
    assert block[1]["sky"] == "light rain showers"
    assert block[1]["wave_max"] == 1.4


def test_build_weather_block_tolerates_missing_marine():
    cities = [{"name": "Sitia"}]
    forecast = [
        {"daily": {"temperature_2m_max": [25.0], "temperature_2m_min": [18.0],
                   "precipitation_sum": [0.0], "wind_speed_10m_max": [15.0],
                   "uv_index_max": [7.0], "weather_code": [0]}},
    ]
    block = dw.build_weather_block(forecast, None, cities)
    assert block[0]["sea_temp"] is None
    assert block[0]["wave_max"] is None
    assert block[0]["sky"] == "clear sky"


def test_build_weather_block_unknown_code_and_dict_input():
    # forecast/marine passed as single dicts (not lists); unknown WMO code -> fallback
    cities = [{"name": "Elounda"}]
    forecast = {"daily": {"temperature_2m_max": [26.0], "temperature_2m_min": [18.0],
                          "precipitation_sum": [0.0], "wind_speed_10m_max": [12.0],
                          "uv_index_max": [6.0], "weather_code": [999]}}
    marine = {"current": {"sea_surface_temperature": 21.0}, "daily": {"wave_height_max": [0.3]}}
    block = dw.build_weather_block(forecast, marine, cities)
    assert len(block) == 1
    assert block[0]["sky"] == "mixed conditions"
    assert block[0]["sea_temp"] == 21.0
    assert block[0]["wave_max"] == 0.3

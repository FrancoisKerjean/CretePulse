from gtfs_calendar import days_to_weekdays, service_id_for

def test_range_mon_fri():
    assert days_to_weekdays("Mon-Fri") == ["mon", "tue", "wed", "thu", "fri"]

def test_enumeration_mon_wed_fri_not_read_as_range():
    # 3 tokens => énumération, PAS la plage mon..fri
    assert days_to_weekdays("Mon-Wed-Fri") == ["mon", "wed", "fri"]

def test_comma_enumeration():
    assert days_to_weekdays("Mon, Tue, Wed") == ["mon", "tue", "wed"]

def test_full_names_range():
    assert days_to_weekdays("Monday To Friday") == ["mon", "tue", "wed", "thu", "fri"]

def test_weekend():
    assert days_to_weekdays("Weekend") == ["sat", "sun"]

def test_weekdays_word():
    assert days_to_weekdays("Weekdays") == ["mon", "tue", "wed", "thu", "fri"]

def test_every_day_and_daily():
    assert days_to_weekdays("Every Day") == ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    assert days_to_weekdays("Daily") == ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

def test_empty_label():
    assert days_to_weekdays("") == []
    assert days_to_weekdays(None) == []

def test_service_id_deterministic_and_collapses_equivalents():
    a = service_id_for(days_to_weekdays("Mon-Fri"))
    b = service_id_for(days_to_weekdays("Monday To Friday"))
    assert a == b == "svc-1111100"

def test_service_id_weekend():
    assert service_id_for(days_to_weekdays("Weekend")) == "svc-0000011"

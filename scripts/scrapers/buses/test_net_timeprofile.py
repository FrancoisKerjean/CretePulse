from net_timeprofile import cumulative_profile

def test_profile_starts_zero_ends_total():
    prof = cumulative_profile(leg_km=[10.0, 30.0], total_minutes=80)
    assert prof[0] == 0
    assert prof[-1] == 80
    assert len(prof) == 3

def test_profile_proportional_to_distance():
    prof = cumulative_profile(leg_km=[10.0, 30.0], total_minutes=80)
    assert prof[1] == 20   # 10/40 * 80

def test_profile_monotonic_non_decreasing():
    prof = cumulative_profile(leg_km=[5.0, 5.0, 5.0], total_minutes=60)
    assert all(prof[i] <= prof[i + 1] for i in range(len(prof) - 1))

def test_profile_estimates_total_when_unknown():
    prof = cumulative_profile(leg_km=[20.0, 20.0], total_minutes=None)
    assert prof[0] == 0 and prof[-1] > 0
    assert prof[1] < prof[-1]

def test_profile_zero_distance_falls_back_to_even_split():
    prof = cumulative_profile(leg_km=[0.0, 0.0], total_minutes=60)
    assert prof == [0, 30, 60]

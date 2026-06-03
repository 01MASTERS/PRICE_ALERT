import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.scheduler import APP_TIMEZONE, calculate_next_check_at, should_check_alert


def as_utc_naive(local_dt: datetime) -> datetime:
    return local_dt.astimezone(timezone.utc).replace(tzinfo=None)


def make_alert(**overrides):
    data = {
        "id": 1,
        "schedule_mode": "period",
        "custom_times": None,
        "last_checked_at": None,
        "next_check_at": None,
        "interval_minutes": 5,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def main():
    period_alert = make_alert(id=1, interval_minutes=5)
    now_utc = datetime(2026, 1, 1, 3, 0)

    assert should_check_alert(period_alert, now_utc)

    period_alert.next_check_at = now_utc + timedelta(minutes=5)
    assert not should_check_alert(period_alert, now_utc + timedelta(minutes=4))
    assert should_check_alert(period_alert, now_utc + timedelta(minutes=5))

    period_alert.last_checked_at = now_utc
    assert calculate_next_check_at(period_alert, now_utc) == now_utc + timedelta(minutes=5)

    custom_local = datetime(2026, 1, 1, 9, 0, tzinfo=APP_TIMEZONE)
    custom_alert = make_alert(
        id=2,
        schedule_mode="custom_times",
        custom_times=json.dumps(["09:00", "14:30"]),
    )

    assert calculate_next_check_at(custom_alert, as_utc_naive(custom_local)) == as_utc_naive(
        custom_local.replace(hour=14, minute=30)
    )

    custom_alert.next_check_at = as_utc_naive(custom_local)
    assert should_check_alert(custom_alert, as_utc_naive(custom_local))

    other_custom = make_alert(
        id=3,
        schedule_mode="custom_times",
        custom_times=json.dumps(["14:30"]),
    )
    assert calculate_next_check_at(other_custom, as_utc_naive(custom_local)) == as_utc_naive(
        custom_local.replace(hour=14, minute=30)
    )

    late_custom_local = datetime(2026, 1, 1, 15, 0, tzinfo=APP_TIMEZONE)
    assert calculate_next_check_at(other_custom, as_utc_naive(late_custom_local)) == as_utc_naive(
        datetime(2026, 1, 2, 8, 0, tzinfo=APP_TIMEZONE)
    )

    print("Scheduler logic checks passed.")


if __name__ == "__main__":
    main()

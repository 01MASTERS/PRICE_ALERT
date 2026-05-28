import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.scheduler import APP_TIMEZONE, should_check_alert


def as_utc_naive(local_dt: datetime) -> datetime:
    return local_dt.astimezone(timezone.utc).replace(tzinfo=None)


def make_alert(**overrides):
    data = {
        "id": 1,
        "schedule_mode": "period",
        "custom_times": None,
        "last_checked_at": None,
        "interval_minutes": 5,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def main():
    period_alert = make_alert(id=1, interval_minutes=5)
    now_utc = datetime.utcnow()
    now_local = datetime.now(APP_TIMEZONE)

    assert should_check_alert(period_alert, now_utc, now_local)

    period_alert.last_checked_at = now_utc
    assert not should_check_alert(period_alert, now_utc + timedelta(minutes=4), now_local)
    assert should_check_alert(period_alert, now_utc + timedelta(minutes=5), now_local)
    assert should_check_alert(period_alert, now_utc + timedelta(minutes=10), now_local)

    custom_local = datetime(2026, 1, 1, 9, 0, tzinfo=APP_TIMEZONE)
    custom_alert = make_alert(
        id=2,
        schedule_mode="custom_times",
        custom_times=json.dumps(["09:00", "14:30"]),
    )

    assert should_check_alert(custom_alert, as_utc_naive(custom_local), custom_local)

    custom_alert.last_checked_at = as_utc_naive(custom_local)
    assert not should_check_alert(custom_alert, as_utc_naive(custom_local), custom_local)

    next_day_same_time = custom_local + timedelta(days=1)
    assert should_check_alert(custom_alert, as_utc_naive(next_day_same_time), next_day_same_time)

    other_custom = make_alert(
        id=3,
        schedule_mode="custom_times",
        custom_times=json.dumps(["14:30"]),
    )
    assert not should_check_alert(other_custom, as_utc_naive(custom_local), custom_local)

    print("Scheduler logic checks passed.")


if __name__ == "__main__":
    main()

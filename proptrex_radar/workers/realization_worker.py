from __future__ import annotations

import json

from ..analytics.realization import refresh_realization_state


def run_once() -> dict:
    return refresh_realization_state()


def main() -> None:
    payload = run_once()
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

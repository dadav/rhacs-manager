"""Root logging configuration with structured ``extra`` fields.

``logging.basicConfig`` drops everything passed via ``logger.x(..., extra={...})``.
These formatters keep it:

- ``json``: one JSON object per line. Reserved top-level keys are ``ts``,
  ``level`` (severity name), ``logger``, ``msg`` and ``exc``. All extras are
  nested under ``"extra"`` so an extra can never overwrite a reserved key.
- ``text``: the previous human-readable format plus `` key=value`` pairs.
"""

import json
import logging
from datetime import UTC, datetime
from typing import Literal

LogFormat = Literal["text", "json"]

# Attributes every LogRecord has; anything else on a record came from ``extra``.
_STANDARD_RECORD_ATTRS = frozenset(vars(logging.makeLogRecord({}))) | {"message", "asctime"}

_TEXT_FORMAT = "%(levelname)s:%(name)s:%(message)s"


def record_extras(record: logging.LogRecord) -> dict:
    return {k: v for k, v in vars(record).items() if k not in _STANDARD_RECORD_ATTRS}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        elif record.exc_text:
            payload["exc"] = record.exc_text
        extras = record_extras(record)
        if extras:
            payload["extra"] = extras
        return json.dumps(payload, default=str, ensure_ascii=False)


class TextFormatter(logging.Formatter):
    def __init__(self) -> None:
        super().__init__(_TEXT_FORMAT)

    def format(self, record: logging.LogRecord) -> str:
        line = super().format(record)
        extras = record_extras(record)
        if not extras:
            return line
        pairs = " ".join(f"{k}={v}" for k, v in extras.items())
        # Keep a multi-line traceback after the key=value pairs of the first line.
        head, sep, tail = line.partition("\n")
        return f"{head} {pairs}{sep}{tail}"


def configure_logging(level: str, fmt: LogFormat) -> None:
    """Replace root handlers with a single stream handler using ``fmt``."""
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter() if fmt == "json" else TextFormatter())
    root = logging.getLogger()
    for existing in list(root.handlers):
        root.removeHandler(existing)
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

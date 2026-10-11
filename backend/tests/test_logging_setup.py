"""Structured logging: extras survive, reserved keys cannot be overwritten."""

import json
import logging

from app.logging_setup import JsonFormatter, TextFormatter


def _record(extra: dict | None = None, exc_info=None) -> logging.LogRecord:
    logger = logging.getLogger("test.logging_setup")
    return logger.makeRecord(logger.name, logging.INFO, __file__, 1, "hello %s", ("world",), exc_info, extra=extra)


def test_json_output_parses_with_nested_extras():
    out = json.loads(JsonFormatter().format(_record({"cve_id": "CVE-1", "user_id": "u1"})))
    assert out["msg"] == "hello world"
    assert out["level"] == "INFO"
    assert out["logger"] == "test.logging_setup"
    assert out["extra"] == {"cve_id": "CVE-1", "user_id": "u1"}


def test_json_extra_named_level_does_not_override_severity():
    out = json.loads(JsonFormatter().format(_record({"level": 2})))
    assert out["level"] == "INFO"
    assert out["extra"]["level"] == 2


def test_json_includes_exception():
    try:
        raise ValueError("boom")
    except ValueError:
        import sys

        out = json.loads(JsonFormatter().format(_record(exc_info=sys.exc_info())))
    assert "ValueError: boom" in out["exc"]


def test_json_without_extras_has_no_extra_key():
    out = json.loads(JsonFormatter().format(_record()))
    assert "extra" not in out


def test_text_appends_key_value_pairs():
    line = TextFormatter().format(_record({"cve_id": "CVE-1"}))
    assert line == "INFO:test.logging_setup:hello world cve_id=CVE-1"

from app.badges.generator import generate_badge_svg


def test_badge_red_when_critical():
    svg = generate_badge_svg(3, 0, 0, 0)
    assert "#e05d44" in svg
    assert "3 kritisch" in svg


def test_badge_yellow_when_only_moderate():
    svg = generate_badge_svg(0, 0, 5, 2)
    assert "#dfb317" in svg
    assert "5 mittel" in svg


def test_badge_green_when_all_zero():
    svg = generate_badge_svg(0, 0, 0, 2)
    assert "#4c1" in svg


def test_badge_yellow_when_only_high():
    svg = generate_badge_svg(0, 2, 0, 0)
    assert "#fe7d37" in svg
    assert "2 hoch" in svg


def test_badge_svg_is_valid():
    svg = generate_badge_svg(1, 2, 3, 4, "Test")
    assert svg.startswith("<svg")
    assert "Test" in svg

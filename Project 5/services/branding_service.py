from __future__ import annotations

from dataclasses import dataclass

from utils.constants import THEME_PRESETS
from utils.placeholders import render_template


@dataclass(frozen=True)
class ThemePalette:
    name: str
    background: tuple[int, int, int]
    panel: tuple[int, int, int, int]
    accent: tuple[int, int, int]
    accent_secondary: tuple[int, int, int]
    text_primary: tuple[int, int, int]
    text_secondary: tuple[int, int, int]
    glow: tuple[int, int, int, int]


class BrandingService:
    def __init__(self, config_service) -> None:
        self.config = config_service
        self._themes = {
            "neon": ThemePalette("Neon", (16, 14, 34), (28, 25, 54, 212), (176, 151, 255), (255, 194, 244), (249, 246, 255), (214, 205, 239), (176, 151, 255, 88)),
            "luxury": ThemePalette("Luxury", (21, 17, 12), (29, 22, 16, 218), (231, 190, 92), (181, 132, 44), (255, 247, 225), (214, 201, 173), (231, 190, 92, 80)),
            "gaming": ThemePalette("Gaming", (13, 17, 22), (16, 23, 35, 220), (120, 255, 97), (41, 121, 255), (242, 248, 255), (173, 193, 219), (120, 255, 97, 90)),
            "minimalist": ThemePalette("Minimalist", (238, 241, 245), (255, 255, 255, 230), (36, 42, 51), (129, 140, 156), (30, 41, 59), (100, 116, 139), (99, 102, 241, 50)),
            "dark_premium": ThemePalette("Dark Premium", (12, 14, 18), (19, 24, 31, 225), (129, 140, 248), (59, 130, 246), (246, 248, 252), (163, 172, 186), (99, 102, 241, 80)),
            "pastel_luxe": ThemePalette("Pastel Luxe", (20, 17, 40), (37, 31, 69, 214), (206, 174, 255), (255, 214, 239), (251, 248, 255), (224, 215, 244), (201, 172, 255, 94)),
        }

    def get_theme(self, requested: str | None = None) -> ThemePalette:
        selected = requested or self.config.get("branding", "default_theme", default="neon")
        if selected not in THEME_PRESETS:
            selected = "neon"
        return self._themes[selected]

    def render(self, template: str, placeholders: dict[str, str]) -> str:
        return render_template(template, placeholders)

    def footer_text(self) -> str:
        return self.config.get("branding", "footer_text", default="Premium onboarding experience")

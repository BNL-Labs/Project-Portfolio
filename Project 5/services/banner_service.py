from __future__ import annotations

from io import BytesIO
from pathlib import Path
import uuid

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from utils.files import ensure_directories
from utils.formatting import clamp_text


class BannerService:
    def __init__(self, config_service, branding_service, generated_dir: Path) -> None:
        self.config = config_service
        self.branding = branding_service
        self.generated_dir = generated_dir
        ensure_directories(generated_dir)

    def create_banner(
        self,
        *,
        member,
        avatar_bytes: bytes | None = None,
        banner_type: str = "welcome",
        theme: str | None = None,
        highlight_text: str | None = None,
        subtitle: str | None = None,
    ) -> tuple[BytesIO, str]:
        palette = self.branding.get_theme(theme)
        width = int(self.config.get("banner", "width", default=1440))
        height = int(self.config.get("banner", "height", default=540))

        canvas = Image.new("RGBA", (width, height), palette.background + (255,))
        canvas = self._apply_background(canvas, palette, theme)
        canvas = self._apply_glass_panel(canvas, palette)
        canvas = self._apply_brand_logo(canvas)

        avatar = self.avatar_from_bytes(avatar_bytes)
        if avatar:
            canvas = self._place_avatar(canvas, avatar, palette)

        display_name = clamp_text(member.display_name, 24)
        username = clamp_text(getattr(member, "name", member.display_name), 20)
        title = highlight_text or ("WELCOME BACK" if banner_type == "returning" else banner_type.upper())
        subtitle = subtitle or member.guild.name

        canvas = self._draw_username_badge(canvas, username, palette)
        canvas = self._apply_stat_ribbons(canvas, member, palette, banner_type)
        canvas = self._draw_text_block(canvas, title, display_name, subtitle, palette)
        canvas = self._apply_finish(canvas, palette)

        output = BytesIO()
        canvas.convert("RGB").save(output, format="PNG", optimize=True)
        output.seek(0)

        if self.config.get("banner", "save_debug_copy", default=False):
            debug_path = self.generated_dir / f"{banner_type}_{member.id}_{uuid.uuid4().hex[:8]}.png"
            canvas.convert("RGB").save(debug_path, format="PNG")

        filename = f"{banner_type}_{member.id}.png"
        return output, filename

    def _apply_background(self, canvas: Image.Image, palette, theme: str | None) -> Image.Image:
        width, height = canvas.size
        background = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(background)

        top_color = tuple(min(255, component + 24) for component in palette.background)
        bottom_color = tuple(max(0, component - 4) for component in palette.background)
        for y in range(height):
            ratio = y / max(1, height - 1)
            line = tuple(int(top_color[i] * (1 - ratio) + bottom_color[i] * ratio) for i in range(3))
            draw.line((0, y, width, y), fill=line + (255,))

        theme_name = (theme or self.config.get("branding", "default_theme", default="pastel_luxe")).lower()
        bg_path_value = self.config.get("branding", "background_paths", default={}).get(theme_name, "")
        bg_path = self.config.resolve_path(bg_path_value) if bg_path_value else None
        if bg_path and bg_path.exists():
            imported = Image.open(bg_path).convert("RGBA")
            imported = ImageOps.fit(imported, canvas.size, method=Image.Resampling.LANCZOS)
            background = Image.blend(background, imported, 0.22)

        blobs = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        blob_draw = ImageDraw.Draw(blobs)
        blob_specs = [
            ((-120, -80, 500, 420), palette.accent_secondary + (84,)),
            ((180, 110, 840, 580), palette.accent + (68,)),
            ((width - 520, -120, width + 140, 360), palette.accent + (70,)),
            ((width - 340, 220, width + 80, height + 140), palette.accent_secondary + (72,)),
            ((520, -70, 1120, 210), (255, 255, 255, 28)),
        ]
        for box, color in blob_specs:
            blob_draw.ellipse(box, fill=color)
        blobs = blobs.filter(ImageFilter.GaussianBlur(58))
        background = Image.alpha_composite(background, blobs)

        spotlight = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        spotlight_draw = ImageDraw.Draw(spotlight)
        spotlight_draw.rounded_rectangle(
            (300, 72, width - 82, height - 72),
            radius=84,
            fill=(255, 255, 255, 18),
        )
        spotlight = spotlight.filter(ImageFilter.GaussianBlur(42))
        background = Image.alpha_composite(background, spotlight)

        lines = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        line_draw = ImageDraw.Draw(lines)
        for offset in range(-80, width, 180):
            line_draw.line((offset, 0, offset + 220, height), fill=(255, 255, 255, 16), width=2)
        for x, y, radius in ((1090, 135, 58), (1185, 336, 32), (1230, 230, 20)):
            line_draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=(255, 255, 255, 64), width=3)
        line_draw.rounded_rectangle((1040, 98, 1270, 170), radius=36, outline=palette.accent_secondary + (110,), width=2)
        line_draw.rounded_rectangle((980, 368, 1280, 452), radius=42, outline=palette.accent + (100,), width=2)
        lines = lines.filter(ImageFilter.GaussianBlur(0.2))
        background = Image.alpha_composite(background, lines)

        texture = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        texture_draw = ImageDraw.Draw(texture)
        for y in range(0, height, 10):
            alpha = 8 if y % 20 == 0 else 4
            texture_draw.line((0, y, width, y), fill=(255, 255, 255, alpha), width=1)
        return Image.alpha_composite(canvas, Image.alpha_composite(background, texture))

    def _apply_glass_panel(self, canvas: Image.Image, palette) -> Image.Image:
        width, height = canvas.size
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        panel_box = (38, 38, width - 38, height - 38)
        draw.rounded_rectangle(panel_box, radius=46, fill=palette.panel, outline=(255, 255, 255, 42), width=2)
        draw.rounded_rectangle((56, 56, width - 56, height - 56), radius=38, outline=palette.accent + (90,), width=2)
        draw.rounded_rectangle((80, 92, 410, height - 92), radius=42, fill=(255, 255, 255, 14))
        draw.rounded_rectangle((440, 88, width - 84, height - 92), radius=42, fill=(255, 255, 255, 10))

        sheen = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        sheen_draw = ImageDraw.Draw(sheen)
        sheen_draw.polygon(
            ((360, 38), (590, 38), (470, height - 38), (240, height - 38)),
            fill=(255, 255, 255, 18),
        )
        sheen = sheen.filter(ImageFilter.GaussianBlur(28))
        overlay = Image.alpha_composite(overlay, sheen)
        return Image.alpha_composite(canvas, overlay)

    def _apply_brand_logo(self, canvas: Image.Image) -> Image.Image:
        path = self.config.resolve_path(self.config.get("branding", "brand_logo_path", default="assets/logo.png"))
        if not path or not path.exists():
            return canvas

        logo = Image.open(path).convert("RGBA")
        logo.thumbnail((110, 110), Image.Resampling.LANCZOS)
        width, _ = canvas.size
        x = width - logo.width - 86
        y = 68

        badge = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        badge_draw = ImageDraw.Draw(badge)
        badge_draw.rounded_rectangle((x - 18, y - 16, x + logo.width + 18, y + logo.height + 16), radius=30, fill=(255, 255, 255, 18))
        badge = badge.filter(ImageFilter.GaussianBlur(14))
        canvas = Image.alpha_composite(canvas, badge)
        canvas.alpha_composite(logo, (x, y))
        return canvas

    def _draw_username_badge(self, canvas: Image.Image, username: str, palette) -> Image.Image:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        font = self._fit_font(f"@{username}", 28, 40, 360, bold=True)
        text = f"@{username}"
        text_width = int(draw.textlength(text, font=font))
        x = 486
        y = 102
        box = (x, y, x + text_width + 54, y + 58)
        draw.rounded_rectangle(box, radius=29, fill=(255, 255, 255, 38), outline=palette.accent_secondary + (120,), width=2)
        draw.rounded_rectangle((x + 12, y + 12, x + 46, y + 46), radius=17, fill=palette.accent + (255,))
        draw.text((x + 58, y + 11), text, font=font, fill=palette.text_primary + (255,))
        return Image.alpha_composite(canvas, overlay)

    def _apply_stat_ribbons(self, canvas: Image.Image, member, palette, banner_type: str) -> Image.Image:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        label_font = self._load_font(18, bold=True)
        value_font = self._load_font(24, bold=True)

        account_age = max(0, (self._now() - member.created_at).days)
        status_value = "READY" if banner_type in {"welcome", "returning", "preview"} else "SESSION CLOSED"
        cards = [
            ("SERVER", clamp_text(member.guild.name.upper(), 16)),
            ("MEMBERS", f"{member.guild.member_count:,}"),
            ("ACCOUNT AGE", f"{account_age} DAYS"),
            ("STATUS", status_value),
        ]

        start_x = 1018
        start_y = 206
        card_width = 154
        card_height = 84
        gap = 16

        for index, (label, value) in enumerate(cards):
            row = index // 2
            col = index % 2
            x = start_x + col * (card_width + gap)
            y = start_y + row * (card_height + gap)
            self._draw_info_card(draw, x, y, card_width, card_height, label, value, label_font, value_font, palette)

        footer_font = self._load_font(20, bold=True)
        self._draw_pill(draw, 1046, 432, "ONBOARDING READY", footer_font, palette, fill=(255, 255, 255, 24), accent=palette.accent_secondary)
        return Image.alpha_composite(canvas, overlay)

    def avatar_from_bytes(self, avatar_bytes: bytes | None) -> Image.Image | None:
        if not avatar_bytes:
            return None
        image = Image.open(BytesIO(avatar_bytes)).convert("RGBA")
        return ImageOps.fit(image, (258, 258), method=Image.Resampling.LANCZOS)

    def _place_avatar(self, canvas: Image.Image, avatar: Image.Image, palette) -> Image.Image:
        avatar = avatar.copy()
        mask = Image.new("L", avatar.size, 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, avatar.width - 1, avatar.height - 1), fill=255)
        avatar.putalpha(mask)

        ring_size = avatar.width + 46
        ring = Image.new("RGBA", (ring_size, ring_size), (0, 0, 0, 0))
        ring_draw = ImageDraw.Draw(ring)
        ring_draw.ellipse((0, 0, ring_size - 1, ring_size - 1), fill=(255, 255, 255, 22))
        ring_draw.ellipse((10, 10, ring_size - 11, ring_size - 11), outline=palette.accent + (255,), width=8)
        ring_draw.ellipse((18, 18, ring_size - 19, ring_size - 19), outline=palette.accent_secondary + (185,), width=4)
        ring_draw.arc((18, 18, ring_size - 19, ring_size - 19), start=210, end=340, fill=(255, 255, 255, 180), width=6)
        ring = ring.filter(ImageFilter.GaussianBlur(0.3))

        glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        center_x = 215
        center_y = canvas.height // 2 + 8
        glow_draw.ellipse((center_x - 195, center_y - 195, center_x + 195, center_y + 195), fill=palette.glow)
        glow_draw.ellipse((center_x - 138, center_y - 138, center_x + 138, center_y + 138), fill=(255, 255, 255, 34))
        glow = glow.filter(ImageFilter.GaussianBlur(34))
        canvas = Image.alpha_composite(canvas, glow)

        frame_x = 78
        frame_y = canvas.height // 2 - ring_size // 2 + 10
        canvas.alpha_composite(ring, (frame_x, frame_y))
        canvas.alpha_composite(avatar, (frame_x + 23, frame_y + 23))

        flare = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        flare_draw = ImageDraw.Draw(flare)
        flare_draw.ellipse((frame_x + 212, frame_y + 32, frame_x + 248, frame_y + 68), fill=(255, 255, 255, 178))
        flare = flare.filter(ImageFilter.GaussianBlur(10))
        return Image.alpha_composite(canvas, flare)

    def _draw_text_block(self, canvas: Image.Image, title: str, name: str, subtitle: str, palette) -> Image.Image:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        width, height = canvas.size

        title_font = self._fit_font(title, 48, 74, 520, bold=True)
        name_font = self._fit_font(name, 58, 92, 520, bold=True)
        subtitle_font = self._fit_font(subtitle, 26, 38, 560, bold=False)
        micro_font = self._load_font(22, bold=True)

        start_x = 480
        title_y = 176
        name_y = title_y + 84
        subtitle_y = name_y + 124

        self._draw_glow_text(overlay, title, (start_x, title_y), title_font, palette.accent_secondary, blur=16)
        self._draw_glow_text(overlay, name, (start_x, name_y), name_font, palette.text_primary, blur=14)
        draw.text((start_x, subtitle_y), subtitle, font=subtitle_font, fill=palette.text_secondary + (255,))
        self._draw_pill(draw, start_x, subtitle_y + 64, "PREMIUM COMMUNITY ONBOARDING", micro_font, palette)
        return Image.alpha_composite(canvas, overlay)

    def _apply_finish(self, canvas: Image.Image, palette) -> Image.Image:
        border = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(border)
        draw.rounded_rectangle((16, 16, canvas.width - 16, canvas.height - 16), radius=48, outline=(255, 255, 255, 40), width=2)
        draw.rounded_rectangle((24, 24, canvas.width - 24, canvas.height - 24), radius=44, outline=palette.accent + (92,), width=1)
        border = border.filter(ImageFilter.GaussianBlur(0.2))
        return Image.alpha_composite(canvas, border)

    def _draw_info_card(self, draw: ImageDraw.ImageDraw, x: int, y: int, width: int, height: int, label: str, value: str, label_font, value_font, palette) -> None:
        draw.rounded_rectangle((x, y, x + width, y + height), radius=28, fill=(255, 255, 255, 24), outline=(255, 255, 255, 58), width=2)
        draw.rounded_rectangle((x + 14, y + 14, x + width - 14, y + height - 14), radius=22, outline=palette.accent + (75,), width=1)
        draw.text((x + 20, y + 16), label, font=label_font, fill=palette.text_secondary + (255,))
        value_box = draw.textbbox((0, 0), value, font=value_font)
        value_y = y + height - (value_box[3] - value_box[1]) - 22
        draw.text((x + 20, value_y), value, font=value_font, fill=palette.text_primary + (255,))

    def _draw_pill(self, draw: ImageDraw.ImageDraw, x: int, y: int, text: str, font, palette, fill: tuple[int, int, int, int] | None = None, accent: tuple[int, int, int] | None = None) -> None:
        box = draw.textbbox((0, 0), text, font=font)
        width = (box[2] - box[0]) + 40
        height = (box[3] - box[1]) + 24
        color = accent or palette.accent
        draw.rounded_rectangle((x, y, x + width, y + height), radius=height // 2, fill=fill or (255, 255, 255, 20), outline=color + (120,), width=2)
        draw.text((x + 20, y + 10), text, font=font, fill=palette.text_primary + (255,))

    def _draw_glow_text(self, base: Image.Image, text: str, position: tuple[int, int], font, color: tuple[int, int, int], blur: int) -> None:
        glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        draw.text(position, text, font=font, fill=color + (255,))
        softened = glow.filter(ImageFilter.GaussianBlur(blur))
        softened_two = glow.filter(ImageFilter.GaussianBlur(max(1, blur // 2)))
        composed = Image.alpha_composite(base, softened)
        composed = Image.alpha_composite(composed, softened_two)
        composed = Image.alpha_composite(composed, glow)
        base.paste(composed)

    def _fit_font(self, text: str, min_size: int, max_size: int, max_width: int, bold: bool = False):
        for size in range(max_size, min_size - 1, -2):
            font = self._load_font(size, bold=bold)
            temp = Image.new("RGBA", (1, 1))
            draw = ImageDraw.Draw(temp)
            if draw.textlength(text, font=font) <= max_width:
                return font
        return self._load_font(min_size, bold=bold)

    def _load_font(self, size: int, *, bold: bool = False):
        candidates = [
            "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
            "arialbd.ttf" if bold else "arial.ttf",
        ]
        for candidate in candidates:
            try:
                return ImageFont.truetype(candidate, size=size)
            except OSError:
                continue
        return ImageFont.load_default()

    @staticmethod
    def _now():
        from datetime import datetime, timezone

        return datetime.now(timezone.utc)

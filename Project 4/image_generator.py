
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import os
import math
import random

# ===== Helpers =====

def _load_font(size: int, bold: bool = True):
    """
    Try to load a clean bold sans font; fall back to default.
    """
    candidates = [
        ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except Exception:
            continue
    return ImageFont.load_default()

def _rounded_rectangle(draw: ImageDraw.ImageDraw, xy, radius, fill=None, outline=None, width=1):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def _add_vignette(img: Image.Image, amount=0.55):
    w, h = img.size
    vignette = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vignette)
    # Elliptical vignette
    pad = int(min(w, h) * (0.04 + amount*0.06))
    vd.ellipse((pad, pad, w - pad, h - pad), fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(int(min(w, h) * 0.06)))
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, int(200 * amount)))
    img.paste(overlay, (0, 0), ImageOps.invert(vignette) if hasattr(Image, "Ops") else vignette.point(lambda p: 255 - p))
    return img

def _neon_gradient(size, colors):
    """Create a smooth radial + linear gradient blend."""
    w, h = size
    base = Image.new("RGBA", (w, h), colors[0])
    # linear overlay
    lin = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lin)
    for i in range(h):
        t = i / max(1, h-1)
        r = int(colors[0][0] * (1-t) + colors[1][0] * t)
        g = int(colors[0][1] * (1-t) + colors[1][1] * t)
        b = int(colors[0][2] * (1-t) + colors[1][2] * t)
        ld.line([(0, i), (w, i)], fill=(r, g, b, 255))
    # radial pop
    rad = Image.new("RGBA", (w, h), (0,0,0,0))
    rd = ImageDraw.Draw(rad)
    cx, cy = int(w*0.35), int(h*0.45)
    rd.ellipse((cx-int(w*0.8), cy-int(h*0.9), cx+int(w*0.8), cy+int(h*0.9)), fill=(255,255,255,60))
    rad = rad.filter(ImageFilter.GaussianBlur(int(min(w,h)*0.18)))
    return Image.alpha_composite(Image.alpha_composite(base, lin.convert("RGBA")), rad)

def _grain(size, alpha=18):
    w, h = size
    noise = Image.new("L", (w, h))
    # Lightweight procedural noise
    px = noise.load()
    import random
    for y in range(h):
        for x in range(w):
            px[x, y] = random.randint(110, 145)
    noise = noise.filter(ImageFilter.GaussianBlur(0.6))
    return Image.merge("RGBA", (noise, noise, noise, Image.new("L", (w, h), alpha)))

def _soft_glow_text(base: Image.Image, text, font, xy, fill=(255,255,255,255), glow_color=(160,0,255,255), glow_radius=14, stroke=2):
    w, h = base.size
    # text layer
    txt = Image.new("RGBA", (w, h), (0,0,0,0))
    tdraw = ImageDraw.Draw(txt)
    # outline
    if stroke > 0:
        tdraw.text(xy, text, font=font, fill=(0,0,0,150), stroke_width=stroke, stroke_fill=(0,0,0,220))
    tdraw.text(xy, text, font=font, fill=fill)
    # glow layers
    glow = Image.new("RGBA", (w, h), (0,0,0,0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.text(xy, text, font=font, fill=glow_color)
    glow = glow.filter(ImageFilter.GaussianBlur(glow_radius))
    glow2 = glow.filter(ImageFilter.GaussianBlur(glow_radius//2))
    combined = Image.alpha_composite(base, glow)
    combined = Image.alpha_composite(combined, glow2)
    combined = Image.alpha_composite(combined, txt)
    return combined

def _circular_avatar(avatar_img: Image.Image, size: int):
    avatar = avatar_img.convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse((0, 0, size, size), fill=255)
    avatar.putalpha(mask)
    return avatar

def _place_logo_watermark(img: Image.Image, logo_path: str, opacity=55, scale=0.6):
    if not (logo_path and os.path.exists(logo_path)):
        return img
    w, h = img.size
    try:
        logo = Image.open(logo_path).convert("RGBA")
        max_dim = int(h * scale)
        ratio = min(max_dim / logo.width, max_dim / logo.height)
        logo = logo.resize((int(logo.width*ratio), int(logo.height*ratio)), Image.LANCZOS)
        # low-opacity, centered watermark
        lw, lh = logo.size
        tmp = Image.new("RGBA", img.size, (0,0,0,0))
        tmp.alpha_composite(logo, (int((w-lw)/2), int((h-lh)/2)))
        # reduce opacity
        a = Image.new("L", (w, h), opacity)
        tmp.putalpha(a)
        blurred = tmp.filter(ImageFilter.GaussianBlur(3))
        return Image.alpha_composite(img, blurred)
    except Exception:
        return img

# ===== Public API (keep signature) =====
def create_welcome_banner(
    username: str,
    avatar_bytes: bytes | None,
    brand_logo_path: str | None,
    out_path: str,
    size=(1200, 400)
):
    """Create a professional neon welcome banner with bigger readable text,
    textured background, soft glow, and optional avatar + brand watermark.
    Signature kept compatible with existing bot code.
    """
    width, height = size

    # Background base: deep space purple -> neon magenta
    base = _neon_gradient((width, height), ((18,12,36,255), (40,10,60,255)))
    base = Image.alpha_composite(base, _grain((width, height), alpha=20))
    base = _place_logo_watermark(base, brand_logo_path, opacity=40, scale=0.7)

    # Rounded neon frame
    frame = Image.new("RGBA", (width, height), (0,0,0,0))
    fd = ImageDraw.Draw(frame)
    pad = int(height * 0.04)
    _rounded_rectangle(fd, (pad, pad, width-pad, height-pad), radius=int(height*0.16), outline=(170,0,255,120), width=4)
    glow = frame.filter(ImageFilter.GaussianBlur(6))
    base = Image.alpha_composite(base, glow)

    draw = ImageDraw.Draw(base)

    # Optional avatar on the left
    left_block = int(height * 0.46)
    left_margin = int(height * 0.08)
    text_left = left_margin + left_block + int(height*0.07)
    vertical_center = int(height/2)

    if avatar_bytes:
        try:
            av = Image.open(BytesIO(avatar_bytes))
            av = _circular_avatar(av, left_block)
            # backing glow circle
            glow_c = Image.new("RGBA", base.size, (0,0,0,0))
            gd = ImageDraw.Draw(glow_c)
            cx = left_margin + left_block//2
            cy = vertical_center
            gd.ellipse((cx-left_block//1.9, cy-left_block//1.9, cx+left_block//1.9, cy+left_block//1.9), fill=(120,0,255,80))
            glow_c = glow_c.filter(ImageFilter.GaussianBlur(18))
            base = Image.alpha_composite(base, glow_c)
            base.alpha_composite(av, (left_margin, cy-left_block//2))
        except Exception:
            pass

    # Big welcome text
    # Scale to height so it's always readable
    title_font = _load_font(int(height * 0.22), bold=True)
    sub_font = _load_font(int(height * 0.10), bold=True)
    small_font = _load_font(int(height * 0.07), bold=False)

    title = "WELCOME"
    # place title near top-left of text area
    tx = text_left
    ty = vertical_center - int(height*0.22)
    base = _soft_glow_text(base, title, title_font, (tx, max(pad, ty)), fill=(235,245,255,255), glow_color=(180,0,255,255), glow_radius=16, stroke=3)

    # Username with neon accent
    uname = f"{username}"
    uy = vertical_center - int(height*0.01)
    base = _soft_glow_text(base, uname, sub_font, (tx, uy), fill=(255,255,255,255), glow_color=(0,180,255,255), glow_radius=12, stroke=2)

    # Tagline
    tagline = "We're glad you're here — enjoy your stay!"
    draw = ImageDraw.Draw(base)
    tw = draw.textlength(tagline, font=small_font)
    draw.text((tx, uy + int(height*0.16)), tagline, font=small_font, fill=(220,220,245,230))

    # Subtle corner sparkles for polish
    deco = Image.new("RGBA", (width, height), (0,0,0,0))
    dd = ImageDraw.Draw(deco)
    for (cx, cy) in [(width-int(height*0.12), int(height*0.22)), (width-int(height*0.2), height-int(height*0.18))]:
        dd.ellipse((cx-3, cy-3, cx+3, cy+3), fill=(255,255,255,210))
        dd.ellipse((cx-10, cy-10, cx+10, cy+10), outline=(180,0,255,100), width=2)
    deco = deco.filter(ImageFilter.GaussianBlur(0.5))
    base = Image.alpha_composite(base, deco)

    # Final mild vignette + save
    base = base.filter(ImageFilter.GaussianBlur(0.4))
    # (keeping vignette gentle to preserve readability)
    # Save
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    base.convert("RGB").save(out_path, format="JPEG", quality=96, subsampling=0)
    return out_path

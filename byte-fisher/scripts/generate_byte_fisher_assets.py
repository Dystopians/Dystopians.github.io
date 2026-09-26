from pathlib import Path
from typing import Iterable, Literal

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "assets" / "generated"
OUT.mkdir(parents=True, exist_ok=True)

RGBA = tuple[int, int, int, int]

TRANSPARENT: RGBA = (0, 0, 0, 0)
INK: RGBA = (43, 27, 18, 255)
INK_SOFT: RGBA = (83, 54, 31, 255)
CREAM: RGBA = (248, 234, 198, 255)
PAPER: RGBA = (245, 223, 170, 255)
GOLD: RGBA = (243, 201, 107, 255)
CORAL: RGBA = (216, 112, 77, 255)
LAKE: RGBA = (105, 167, 173, 255)
LAKE_DARK: RGBA = (47, 111, 130, 255)
LEAF: RGBA = (127, 179, 95, 255)
LEAF_DARK: RGBA = (66, 103, 48, 255)
WOOD: RGBA = (107, 66, 31, 255)
WOOD_LIGHT: RGBA = (160, 106, 53, 255)
SKIN: RGBA = (232, 155, 95, 255)
SKIN_LIGHT: RGBA = (255, 197, 136, 255)
WHITE: RGBA = (255, 250, 232, 255)
BLACK: RGBA = (18, 20, 19, 255)


def save(img: Image.Image, name: str) -> None:
    img.save(OUT / name)


def px_rect(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill: RGBA) -> None:
    draw.rectangle(xy, fill=fill)


def outline_polygon(draw: ImageDraw.ImageDraw, points: Iterable[tuple[int, int]], fill: RGBA, outline=INK) -> None:
    pts = list(points)
    draw.polygon(pts, fill=outline)
    cx = sum(x for x, _ in pts) / len(pts)
    cy = sum(y for _, y in pts) / len(pts)
    inset = []
    for x, y in pts:
        nx = int(round(x + (cx - x) * 0.1))
        ny = int(round(y + (cy - y) * 0.1))
        inset.append((nx, ny))
    draw.polygon(inset, fill=fill)


def draw_eye(draw: ImageDraw.ImageDraw, x: int, y: int, scale: int = 1) -> None:
    draw.rectangle((x, y, x + 6 * scale, y + 6 * scale), fill=INK)
    draw.rectangle((x + scale, y + scale, x + 3 * scale, y + 3 * scale), fill=WHITE)
    draw.rectangle((x + 4 * scale, y + 3 * scale, x + 5 * scale, y + 5 * scale), fill=BLACK)


def fish_sprite(
    name: str,
    body: RGBA,
    shade: RGBA,
    belly: RGBA,
    accent: RGBA,
    tail: RGBA,
    pattern: Literal["guppy", "bass", "trout", "koi", "catfish", "space", "byte"],
) -> None:
    img = Image.new("RGBA", (96, 64), TRANSPARENT)
    d = ImageDraw.Draw(img)

    if pattern == "guppy":
        outline_polygon(d, [(70, 32), (94, 14), (88, 32), (94, 50)], tail)
        d.polygon([(70, 32), (90, 22), (84, 32), (90, 42)], fill=(62, 126, 179, 255))
        d.ellipse((15, 17, 72, 47), fill=INK)
        d.ellipse((18, 18, 70, 46), fill=body)
        d.polygon([(34, 19), (46, 8), (49, 24)], fill=tail)
        d.polygon([(35, 45), (48, 56), (50, 39)], fill=tail)
        d.ellipse((39, 24, 58, 38), fill=(67, 137, 184, 255))
        d.rectangle((55, 28, 65, 33), fill=(84, 151, 190, 255))
        d.arc((14, 25, 27, 39), 90, 250, fill=shade, width=2)
        draw_eye(d, 22, 23)

    elif pattern == "bass":
        outline_polygon(d, [(75, 31), (94, 17), (90, 32), (94, 47)], shade)
        d.ellipse((10, 13, 78, 49), fill=INK)
        d.ellipse((13, 14, 76, 48), fill=body)
        d.rectangle((29, 22, 66, 42), fill=body)
        d.polygon([(36, 15), (51, 4), (62, 16)], fill=shade)
        d.polygon([(42, 45), (55, 58), (63, 43)], fill=shade)
        d.rectangle((19, 38, 66, 45), fill=belly)
        for x in (34, 43, 52, 61):
            d.polygon([(x, 15), (x + 7, 17), (x + 3, 43), (x - 3, 42)], fill=(72, 96, 42, 170))
        draw_eye(d, 20, 21)
        d.arc((7, 26, 23, 38), 85, 255, fill=INK_SOFT, width=2)

    elif pattern == "trout":
        outline_polygon(d, [(76, 32), (94, 18), (88, 32), (94, 46)], tail)
        d.ellipse((10, 15, 80, 49), fill=INK)
        d.ellipse((13, 16, 78, 48), fill=body)
        d.rectangle((25, 26, 71, 38), fill=body)
        d.rectangle((20, 37, 72, 44), fill=belly)
        d.line((19, 31, 74, 31), fill=accent, width=3)
        for x in (33, 40, 51, 58, 66):
            d.rectangle((x, 20, x + 2, 22), fill=INK_SOFT)
            d.rectangle((x - 4, 39, x - 2, 41), fill=INK_SOFT)
        d.polygon([(45, 17), (58, 7), (64, 21)], fill=tail)
        d.polygon([(49, 45), (61, 55), (66, 41)], fill=tail)
        draw_eye(d, 20, 22)

    elif pattern == "koi":
        outline_polygon(d, [(75, 32), (94, 14), (90, 32), (94, 50)], tail)
        d.ellipse((9, 10, 82, 53), fill=INK)
        d.ellipse((12, 12, 80, 51), fill=belly)
        d.polygon([(22, 13), (44, 13), (40, 29), (18, 33)], fill=body)
        d.polygon([(49, 14), (72, 18), (69, 37), (47, 31)], fill=body)
        d.polygon([(33, 13), (48, 2), (56, 20)], fill=CREAM)
        d.polygon([(35, 49), (50, 62), (58, 42)], fill=CREAM)
        d.line((16, 34, 24, 29), fill=INK_SOFT, width=2)
        d.line((14, 39, 24, 33), fill=INK_SOFT, width=2)
        draw_eye(d, 20, 23)

    elif pattern == "catfish":
        outline_polygon(d, [(77, 32), (95, 17), (91, 32), (95, 47)], shade)
        d.ellipse((7, 14, 83, 50), fill=INK)
        d.ellipse((10, 15, 80, 49), fill=body)
        d.rectangle((26, 23, 74, 41), fill=body)
        d.rectangle((15, 37, 74, 45), fill=(165, 181, 184, 255))
        d.polygon([(39, 16), (55, 3), (65, 20)], fill=shade)
        d.polygon([(48, 44), (62, 57), (70, 41)], fill=shade)
        for offset in (0, 6, 12):
            d.line((11, 34 + offset // 3, 1, 31 + offset), fill=INK_SOFT, width=2)
        for x in (34, 45, 57, 68):
            d.rectangle((x, 24, x + 2, 26), fill=(216, 228, 221, 160))
        draw_eye(d, 22, 23)

    elif pattern == "space":
        outline_polygon(d, [(75, 32), (94, 18), (88, 32), (94, 46)], (202, 194, 241, 210))
        d.ellipse((12, 14, 78, 50), fill=(86, 90, 120, 120))
        d.ellipse((15, 16, 76, 48), fill=body)
        d.polygon([(42, 16), (56, 3), (65, 23)], fill=(199, 182, 235, 190))
        d.polygon([(44, 46), (58, 60), (66, 40)], fill=(199, 182, 235, 190))
        d.ellipse((38, 25, 58, 43), fill=(190, 166, 228, 170))
        for x, y in [(28, 22), (47, 18), (66, 28), (35, 44), (59, 39)]:
            d.rectangle((x, y, x + 2, y + 2), fill=GOLD)
        draw_eye(d, 22, 24)

    else:
        outline_polygon(d, [(75, 32), (93, 18), (88, 32), (93, 46)], GOLD)
        d.ellipse((12, 16, 79, 48), fill=INK)
        d.ellipse((15, 18, 76, 46), fill=PAPER)
        d.rectangle((30, 25, 62, 39), fill=CREAM)
        d.line((34, 26, 34, 39), fill=WOOD, width=2)
        d.line((47, 26, 47, 39), fill=WOOD, width=2)
        d.line((60, 26, 60, 39), fill=WOOD, width=2)
        d.polygon([(42, 18), (56, 8), (62, 22)], fill=LAKE)
        draw_eye(d, 21, 23)

    save(img, name)


def make_fish_assets() -> None:
    fish_sprite("fish_neon_guppy.png", (239, 141, 58, 255), (183, 84, 45, 255), CREAM, LAKE, (239, 127, 47, 255), "guppy")
    fish_sprite("fish_binary_bass.png", (112, 139, 67, 255), (69, 91, 47, 255), (232, 222, 170, 255), GOLD, (83, 103, 51, 255), "bass")
    fish_sprite("fish_glitch_trout.png", (205, 167, 92, 255), (132, 98, 58, 255), CREAM, CORAL, (171, 132, 71, 255), "trout")
    fish_sprite("fish_cyber_koi.png", (211, 72, 37, 255), CORAL, WHITE, GOLD, CREAM, "koi")
    fish_sprite("fish_mainframe_shark.png", (79, 108, 129, 255), (43, 70, 92, 255), (183, 197, 197, 255), GOLD, (45, 72, 96, 255), "catfish")
    fish_sprite("fish_space.png", (193, 218, 234, 190), LAKE, (226, 230, 242, 180), GOLD, (188, 179, 235, 190), "space")
    fish_sprite("byte_fish.png", PAPER, WOOD, CREAM, LAKE, GOLD, "byte")
    fish_sprite("char_byte.png", PAPER, WOOD, CREAM, LAKE, GOLD, "byte")
    fish_sprite("minigame_target.png", (239, 141, 58, 255), (183, 84, 45, 255), CREAM, LAKE, (239, 127, 47, 255), "guppy")


def item_icon(name: str, primary: RGBA, secondary: RGBA, shape: str = "file") -> None:
    img = Image.new("RGBA", (64, 64), TRANSPARENT)
    d = ImageDraw.Draw(img)
    if shape == "file":
        d.rectangle((15, 9, 48, 54), fill=PAPER, outline=INK, width=2)
        d.polygon([(38, 9), (48, 19), (38, 19)], fill=secondary)
        d.rectangle((21, 25, 42, 29), fill=primary)
        d.rectangle((21, 36, 36, 40), fill=secondary)
    elif shape == "chest":
        d.rectangle((10, 25, 54, 52), fill=WOOD, outline=INK, width=2)
        d.rectangle((8, 17, 56, 30), fill=WOOD_LIGHT, outline=INK, width=2)
        d.rectangle((28, 28, 36, 40), fill=GOLD, outline=INK)
        d.line((12, 32, 52, 32), fill=GOLD, width=2)
    else:
        d.ellipse((14, 13, 50, 49), fill=PAPER, outline=INK, width=2)
        d.line((20, 42, 46, 18), fill=primary, width=4)
        d.arc((14, 12, 50, 48), 210, 30, fill=secondary, width=2)
    save(img, name)


def make_item_assets() -> None:
    item_icon("trash_corrupted.png", CORAL, LAKE)
    item_icon("trash_404.png", LAKE, CORAL)
    item_icon("trash_null.png", INK_SOFT, LAKE)
    item_icon("trash_deprecated.png", GOLD, INK_SOFT)
    item_icon("trash_spaghetti.png", CORAL, GOLD, "tangle")
    item_icon("special_treasure_chest.png", GOLD, LAKE, "chest")


def make_character() -> None:
    img = Image.new("RGBA", (128, 160), TRANSPARENT)
    d = ImageDraw.Draw(img)

    # Boots and legs
    d.rectangle((42, 112, 56, 137), fill=(132, 83, 42, 255), outline=INK, width=2)
    d.rectangle((72, 112, 86, 137), fill=(132, 83, 42, 255), outline=INK, width=2)
    d.rectangle((34, 134, 58, 146), fill=(107, 66, 31, 255), outline=INK, width=2)
    d.rectangle((70, 134, 94, 146), fill=(107, 66, 31, 255), outline=INK, width=2)
    d.rectangle((44, 78, 61, 116), fill=(141, 94, 54, 255), outline=INK, width=2)
    d.rectangle((67, 78, 84, 116), fill=(141, 94, 54, 255), outline=INK, width=2)
    d.rectangle((42, 108, 61, 116), fill=PAPER)
    d.rectangle((67, 108, 86, 116), fill=PAPER)

    # Torso, vest, scarf
    d.rectangle((39, 42, 89, 84), fill=(229, 215, 171, 255), outline=INK, width=2)
    d.rectangle((35, 43, 52, 89), fill=LAKE_DARK, outline=INK, width=2)
    d.rectangle((76, 43, 93, 89), fill=LAKE_DARK, outline=INK, width=2)
    d.rectangle((42, 51, 53, 78), fill=(117, 120, 58, 255), outline=INK, width=1)
    d.rectangle((75, 51, 86, 78), fill=(117, 120, 58, 255), outline=INK, width=1)
    d.rectangle((46, 81, 82, 88), fill=WOOD, outline=INK, width=1)
    d.rectangle((60, 80, 70, 90), fill=GOLD, outline=INK, width=1)
    d.polygon([(55, 42), (64, 57), (48, 62)], fill=CORAL, outline=INK)
    d.polygon([(73, 42), (64, 57), (80, 62)], fill=CORAL, outline=INK)

    # Arms
    d.rectangle((25, 52, 39, 83), fill=LAKE_DARK, outline=INK, width=2)
    d.rectangle((88, 52, 101, 82), fill=LAKE_DARK, outline=INK, width=2)
    d.rectangle((25, 78, 39, 100), fill=SKIN_LIGHT, outline=INK, width=2)
    d.rectangle((89, 78, 101, 99), fill=SKIN_LIGHT, outline=INK, width=2)
    d.rectangle((88, 96, 103, 108), fill=SKIN, outline=INK, width=2)

    # Neck, face, hair, hat
    d.rectangle((56, 34, 72, 45), fill=SKIN, outline=INK, width=1)
    d.ellipse((42, 12, 86, 50), fill=SKIN_LIGHT, outline=INK, width=2)
    d.polygon([(43, 20), (56, 9), (81, 12), (88, 23), (78, 27), (70, 19), (58, 28)], fill=(100, 55, 24, 255))
    d.rectangle((51, 28, 57, 34), fill=INK)
    d.rectangle((73, 28, 79, 34), fill=INK)
    d.rectangle((52, 29, 54, 31), fill=WHITE)
    d.rectangle((74, 29, 76, 31), fill=WHITE)
    d.arc((57, 34, 76, 43), 15, 165, fill=INK_SOFT, width=2)
    d.ellipse((31, 4, 97, 25), fill=GOLD, outline=INK, width=2)
    d.ellipse((43, 0, 85, 26), fill=(220, 162, 67, 255), outline=INK, width=2)
    d.rectangle((40, 17, 90, 23), fill=WOOD, outline=INK, width=1)
    for x in range(45, 84, 7):
        d.line((x, 3, x + 11, 22), fill=(244, 198, 94, 180), width=1)

    # Rod in hand
    d.line((99, 101, 114, 16), fill=INK, width=4)
    d.line((100, 101, 115, 16), fill=WOOD_LIGHT, width=2)
    d.ellipse((92, 88, 106, 102), outline=INK, width=2)
    d.ellipse((95, 91, 103, 99), outline=(130, 130, 118, 255), width=2)
    d.line((114, 16, 118, 58), fill=CREAM, width=1)
    d.ellipse((114, 59, 122, 70), fill=CORAL, outline=INK, width=1)

    save(img, "fisher_character.png")


def make_equipment() -> None:
    palettes = {
        "rod": [WOOD, WOOD_LIGHT, LAKE_DARK, CORAL, GOLD],
        "boots": [WOOD, WOOD_LIGHT, LEAF_DARK, CORAL, GOLD],
        "headgear": [GOLD, WOOD_LIGHT, LAKE, LEAF, CORAL],
        "backpack": [LEAF_DARK, LEAF, LAKE, CORAL],
    }

    for group, colors in palettes.items():
        start = 2 if group == "backpack" else 1
        for idx, color in enumerate(colors, start=start):
            img = Image.new("RGBA", (64, 64), TRANSPARENT)
            d = ImageDraw.Draw(img)
            if group == "rod":
                d.line((12, 53, 54, 11), fill=INK, width=5)
                d.line((13, 52, 54, 11), fill=color, width=3)
                d.ellipse((21, 39, 36, 54), outline=INK, width=2)
                d.ellipse((24, 42, 33, 51), outline=PAPER, width=2)
            elif group == "boots":
                d.rectangle((9, 31, 28, 49), fill=color, outline=INK, width=2)
                d.rectangle((34, 31, 53, 49), fill=color, outline=INK, width=2)
                d.rectangle((8, 46, 30, 54), fill=WOOD, outline=INK)
                d.rectangle((33, 46, 55, 54), fill=WOOD, outline=INK)
            elif group == "headgear":
                d.ellipse((10, 29, 54, 39), fill=GOLD, outline=INK, width=2)
                d.ellipse((18, 15, 46, 39), fill=color, outline=INK, width=2)
                d.rectangle((15, 31, 50, 36), fill=WOOD, outline=INK)
            else:
                d.rectangle((17, 16, 45, 49), fill=color, outline=INK, width=2)
                d.rectangle((22, 22, 40, 35), fill=PAPER, outline=INK)
                d.line((45, 18, 54, 11), fill=INK, width=2)
                if idx >= 4:
                    d.ellipse((44, 8, 59, 23), outline=GOLD, width=2)
            save(img, f"equipment_{group}_lv{idx}.png")


def make_environment() -> None:
    img = Image.new("RGBA", (1536, 864), (47, 105, 114, 255))
    d = ImageDraw.Draw(img)
    for y in range(864):
        if y < 360:
            t = y / 360
            r = int(142 + (74 - 142) * t)
            g = int(196 + (147 - 196) * t)
            b = int(190 + (154 - 190) * t)
        else:
            t = (y - 360) / 504
            r = int(88 + (24 - 88) * t)
            g = int(157 + (72 - 157) * t)
            b = int(165 + (83 - 165) * t)
        d.line((0, y, 1536, y), fill=(r, g, b, 255))

    # Distant shoreline and soft hills: no vertical or diagonal digital lines.
    d.polygon([(0, 260), (160, 190), (330, 238), (510, 178), (760, 250), (980, 200), (1160, 238), (1340, 180), (1536, 252), (1536, 340), (0, 340)], fill=(88, 129, 77, 255))
    d.polygon([(0, 306), (240, 272), (480, 306), (760, 276), (990, 312), (1240, 276), (1536, 310), (1536, 368), (0, 368)], fill=(106, 151, 83, 255))
    d.rectangle((0, 348, 1536, 372), fill=(225, 198, 126, 255))
    d.rectangle((0, 372, 1536, 864), fill=(61, 131, 142, 255))
    for y in range(398, 842, 26):
        alpha = max(34, 124 - y // 9)
        phase = (y * 7) % 96
        for x in range(-phase, 1536, 118):
            d.line((x, y, x + 58, y), fill=(245, 223, 170, alpha), width=3)
            d.line((x + 74, y + 8, x + 112, y + 8), fill=(105, 167, 173, max(28, alpha - 18)), width=2)

    # A few tiny lily pads and reeds at the far shore, deliberately horizontal/clustered.
    for x in range(80, 1460, 180):
        d.ellipse((x, 405 + (x % 4) * 6, x + 48, 418 + (x % 4) * 6), fill=(75, 128, 67, 210))
        d.line((x + 34, 408 + (x % 4) * 6, x + 48, 400 + (x % 4) * 6), fill=(53, 91, 47, 210), width=2)

    save(img, "environment_digital_ocean.png")

    water = Image.new("RGBA", (128, 128), (66, 139, 151, 255))
    wd = ImageDraw.Draw(water)
    for y in range(10, 128, 24):
        wd.arc((-20, y, 72, y + 24), 10, 170, fill=(248, 234, 198, 70), width=2)
        wd.arc((52, y + 8, 148, y + 30), 10, 170, fill=(105, 167, 173, 90), width=2)
    save(water, "tile_water.png")

    pier = Image.new("RGBA", (128, 64), TRANSPARENT)
    pd = ImageDraw.Draw(pier)
    pd.rectangle((0, 8, 128, 50), fill=WOOD, outline=INK, width=2)
    for y in (17, 31, 45):
        pd.line((0, y, 128, y), fill=WOOD_LIGHT, width=2)
    for x in range(12, 128, 28):
        pd.rectangle((x, 5, x + 6, 53), fill=(89, 54, 25, 255))
    save(pier, "tile_pier.png")


def main() -> None:
    make_fish_assets()
    make_item_assets()
    make_character()
    make_equipment()
    make_environment()


if __name__ == "__main__":
    main()

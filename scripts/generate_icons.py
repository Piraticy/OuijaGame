#!/usr/bin/env python3

import math
import os
import struct
import zlib


ROOT = os.path.dirname(os.path.dirname(__file__))
ICON_DIR = os.path.join(ROOT, "public", "icons")


def clamp(value, low=0, high=255):
    return max(low, min(high, int(value)))


def mix(color_a, color_b, amount):
    return tuple(
        clamp((channel_a * (1 - amount)) + (channel_b * amount))
        for channel_a, channel_b in zip(color_a, color_b)
    )


def blank_canvas(size, color=(0, 0, 0, 0)):
    return [[list(color) for _ in range(size)] for _ in range(size)]


def set_pixel(canvas, x, y, color):
    size = len(canvas)

    if 0 <= x < size and 0 <= y < size:
        canvas[y][x] = list(color)


def blend_pixel(canvas, x, y, color, alpha):
    size = len(canvas)

    if not (0 <= x < size and 0 <= y < size):
        return

    base = canvas[y][x]
    amount = max(0.0, min(1.0, alpha))
    inverse = 1.0 - amount
    canvas[y][x] = [
        clamp(base[index] * inverse + color[index] * amount)
        for index in range(4)
    ]


def draw_circle(canvas, center_x, center_y, radius, color, softness=1.8):
    min_x = max(0, int(center_x - radius - softness - 1))
    max_x = min(len(canvas), int(center_x + radius + softness + 1))
    min_y = max(0, int(center_y - radius - softness - 1))
    max_y = min(len(canvas), int(center_y + radius + softness + 1))

    for y in range(min_y, max_y):
        for x in range(min_x, max_x):
            distance = math.hypot(x + 0.5 - center_x, y + 0.5 - center_y)

            if distance <= radius:
                set_pixel(canvas, x, y, color)
            elif distance <= radius + softness:
                fade = 1 - ((distance - radius) / softness)
                blend_pixel(canvas, x, y, color, fade)


def draw_rounded_rect(canvas, x0, y0, x1, y1, radius, fill_color, border_width=0, border_color=None):
    for y in range(y0, y1):
        for x in range(x0, x1):
            dx = max(x0 + radius - x - 0.5, 0, x + 0.5 - (x1 - radius))
            dy = max(y0 + radius - y - 0.5, 0, y + 0.5 - (y1 - radius))
            inside = (dx * dx) + (dy * dy) <= radius * radius

            if not inside:
                continue

            color = fill_color

            if border_width and border_color:
                inner_x0 = x0 + border_width
                inner_y0 = y0 + border_width
                inner_x1 = x1 - border_width
                inner_y1 = y1 - border_width
                inner_radius = max(0, radius - border_width)
                inner_dx = max(inner_x0 + inner_radius - x - 0.5, 0, x + 0.5 - (inner_x1 - inner_radius))
                inner_dy = max(inner_y0 + inner_radius - y - 0.5, 0, y + 0.5 - (inner_y1 - inner_radius))
                inner_inside = (
                    inner_x0 <= x < inner_x1
                    and inner_y0 <= y < inner_y1
                    and (inner_dx * inner_dx) + (inner_dy * inner_dy) <= inner_radius * inner_radius
                )

                if not inner_inside:
                    color = border_color

            set_pixel(canvas, x, y, color)


def draw_background(canvas):
    size = len(canvas)
    top = (45, 28, 20, 255)
    bottom = (15, 12, 10, 255)
    center_glow = (164, 110, 52, 255)

    for y in range(size):
        vertical = y / max(1, size - 1)
        row_color = mix(top, bottom, vertical)

        for x in range(size):
            horizontal = abs((x / max(1, size - 1)) - 0.5) * 1.6
            glow = max(0.0, 0.82 - math.hypot(horizontal, (vertical - 0.34) * 1.25))
            color = mix(row_color, center_glow, glow * 0.42)
            set_pixel(canvas, x, y, color)


def draw_board(canvas, pad_ratio):
    size = len(canvas)
    pad = int(size * pad_ratio)
    board = (185, 129, 73, 255)
    inner = (160, 110, 61, 255)
    line = (244, 223, 186, 68)

    draw_rounded_rect(canvas, pad, pad, size - pad, size - pad, int(size * 0.11), board)
    draw_rounded_rect(
        canvas,
        pad + int(size * 0.045),
        pad + int(size * 0.045),
        size - pad - int(size * 0.045),
        size - pad - int(size * 0.045),
        int(size * 0.08),
        inner,
        border_width=max(2, size // 120),
        border_color=line
    )

    draw_circle(
        canvas,
        size * 0.5,
        size * 0.58,
        size * 0.22,
        (199, 149, 91, 72),
        softness=size * 0.03
    )


def rotate_point(px, py, center_x, center_y, angle_radians):
    shifted_x = px - center_x
    shifted_y = py - center_y
    rotated_x = (shifted_x * math.cos(angle_radians)) - (shifted_y * math.sin(angle_radians))
    rotated_y = (shifted_x * math.sin(angle_radians)) + (shifted_y * math.cos(angle_radians))
    return rotated_x + center_x, rotated_y + center_y


def point_in_polygon(px, py, polygon):
    inside = False
    point_count = len(polygon)

    for index in range(point_count):
        x1, y1 = polygon[index]
        x2, y2 = polygon[(index + 1) % point_count]

        intersects = ((y1 > py) != (y2 > py)) and (
            px < ((x2 - x1) * (py - y1) / ((y2 - y1) or 1e-9)) + x1
        )

        if intersects:
            inside = not inside

    return inside


def draw_planchette(canvas, center_x, center_y, width, height):
    angle = math.radians(45)
    base_points = [
        (center_x - width * 0.28, center_y - height * 0.36),
        (center_x + width * 0.28, center_y - height * 0.36),
        (center_x + width * 0.38, center_y + height * 0.05),
        (center_x + width * 0.18, center_y + height * 0.38),
        (center_x, center_y + height * 0.44),
        (center_x - width * 0.18, center_y + height * 0.38),
        (center_x - width * 0.38, center_y + height * 0.05)
    ]
    polygon = [rotate_point(x, y, center_x, center_y, angle) for x, y in base_points]
    min_x = int(min(point[0] for point in polygon))
    max_x = int(max(point[0] for point in polygon))
    min_y = int(min(point[1] for point in polygon))
    max_y = int(max(point[1] for point in polygon))
    highlight = (163, 97, 43, 255)
    shadow = (79, 42, 17, 255)

    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            if not point_in_polygon(x + 0.5, y + 0.5, polygon):
                continue

            tone = ((x - min_x) / max(1, (max_x - min_x))) * 0.4 + ((y - min_y) / max(1, (max_y - min_y))) * 0.6
            color = mix(highlight, shadow, tone)
            set_pixel(canvas, x, y, color)

    draw_circle(canvas, center_x, center_y - height * 0.02, width * 0.18, (244, 231, 208, 255))
    draw_circle(canvas, center_x, center_y - height * 0.02, width * 0.10, (53, 27, 13, 255))
    draw_circle(canvas, center_x, center_y - height * 0.02, width * 0.07, (244, 231, 208, 255))


def write_png(path, canvas):
    height = len(canvas)
    width = len(canvas[0])
    raw = bytearray()

    for row in canvas:
        raw.append(0)
        for r, g, b, a in row:
            raw.extend([r, g, b, a])

    def chunk(name, payload):
        return (
            struct.pack(">I", len(payload))
            + name
            + payload
            + struct.pack(">I", zlib.crc32(name + payload) & 0xFFFFFFFF)
        )

    png = bytearray()
    png.extend(b"\x89PNG\r\n\x1a\n")
    png.extend(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)))
    png.extend(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
    png.extend(chunk(b"IEND", b""))

    with open(path, "wb") as file_handle:
        file_handle.write(png)


def create_icon(size, mode):
    canvas = blank_canvas(size)
    draw_background(canvas)

    if mode == "maskable":
        draw_circle(canvas, size * 0.5, size * 0.22, size * 0.12, (255, 206, 114, 64), softness=size * 0.04)
        draw_board(canvas, 0.14)
        draw_planchette(canvas, size * 0.5, size * 0.58, size * 0.24, size * 0.27)
    elif mode == "apple":
        draw_board(canvas, 0.11)
        draw_planchette(canvas, size * 0.5, size * 0.57, size * 0.23, size * 0.25)
    else:
        draw_circle(canvas, size * 0.5, size * 0.16, size * 0.10, (255, 206, 114, 54), softness=size * 0.05)
        draw_board(canvas, 0.12)
        draw_planchette(canvas, size * 0.5, size * 0.6, size * 0.23, size * 0.26)

    return canvas


def main():
    os.makedirs(ICON_DIR, exist_ok=True)

    write_png(os.path.join(ICON_DIR, "icon-192.png"), create_icon(192, "regular"))
    write_png(os.path.join(ICON_DIR, "icon-512.png"), create_icon(512, "regular"))
    write_png(os.path.join(ICON_DIR, "icon-maskable-512.png"), create_icon(512, "maskable"))
    write_png(os.path.join(ICON_DIR, "apple-touch-icon.png"), create_icon(180, "apple"))


if __name__ == "__main__":
    main()

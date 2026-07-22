#!/usr/bin/env python3
"""Normalize an RGBA contact sheet into an exact frame grid without distortion."""

from argparse import ArgumentParser
from collections import deque
from pathlib import Path

from PIL import Image


def split_boundaries(row: Image.Image, columns: int) -> list[int]:
    """Find transparent valleys between figures instead of blindly slicing limbs."""
    alpha = row.getchannel("A")
    nominal = row.width / columns
    column_ink = [sum(alpha.crop((x, 0, x + 1, row.height)).histogram()[25:]) for x in range(row.width)]
    boundaries = [0]
    for index in range(1, columns):
        center = round(index * nominal)
        radius = max(8, round(nominal * .22))
        start, end = max(boundaries[-1] + 1, center - radius), min(row.width - 1, center + radius)
        minimum = min(column_ink[start:end + 1])
        candidates = [x for x in range(start, end + 1) if column_ink[x] == minimum]
        boundaries.append(min(candidates, key=lambda x: abs(x - center)))
    boundaries.append(row.width)
    return boundaries


def largest_component_bbox(alpha: Image.Image, threshold: int = 24) -> tuple[int, int, int, int] | None:
    """Ignore disconnected fragments that leaked in from a neighboring pose."""
    width, height = alpha.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    largest: tuple[int, tuple[int, int, int, int]] | None = None
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if visited[index] or pixels[x, y] <= threshold:
                continue
            visited[index] = 1
            queue = deque([(x, y)])
            count = 0
            left = right = x
            top = bottom = y
            while queue:
                current_x, current_y = queue.popleft()
                count += 1
                left, right = min(left, current_x), max(right, current_x)
                top, bottom = min(top, current_y), max(bottom, current_y)
                for next_x, next_y in ((current_x - 1, current_y), (current_x + 1, current_y), (current_x, current_y - 1), (current_x, current_y + 1)):
                    if next_x < 0 or next_x >= width or next_y < 0 or next_y >= height:
                        continue
                    next_index = next_y * width + next_x
                    if visited[next_index] or pixels[next_x, next_y] <= threshold:
                        continue
                    visited[next_index] = 1
                    queue.append((next_x, next_y))
            bbox = (left, top, right + 1, bottom + 1)
            if largest is None or count > largest[0]:
                largest = (count, bbox)
    return None if largest is None else largest[1]


def normalize_cells(source: Image.Image, columns: int, rows: int, frame_width: int, frame_height: int) -> Image.Image:
    sheet = Image.new("RGBA", (columns * frame_width, rows * frame_height), (0, 0, 0, 0))
    source_row_height = source.height / rows

    for row_index in range(rows):
        row_top = round(row_index * source_row_height)
        row_bottom = round((row_index + 1) * source_row_height)
        source_row = source.crop((0, row_top, source.width, row_bottom))
        boundaries = split_boundaries(source_row, columns)
        figures: list[Image.Image] = []
        for column in range(columns):
            segment = source_row.crop((boundaries[column], 0, boundaries[column + 1], source_row.height))
            bbox = largest_component_bbox(segment.getchannel("A"))
            if bbox is None:
                figures.append(Image.new("RGBA", (1, 1), (0, 0, 0, 0)))
            else:
                figures.append(segment.crop(bbox))

        max_width = max(figure.width for figure in figures)
        max_height = max(figure.height for figure in figures)
        common_scale = min((frame_width - 20) / max_width, (frame_height - 42) / max_height)
        baseline = frame_height - 25
        for column, figure in enumerate(figures):
            resized = figure.resize((max(1, round(figure.width * common_scale)), max(1, round(figure.height * common_scale))), Image.Resampling.LANCZOS)
            x = column * frame_width + (frame_width - resized.width) // 2
            y = row_index * frame_height + baseline - resized.height
            sheet.alpha_composite(resized, (x, y))

    return sheet


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--columns", type=int, required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--frame-width", type=int, required=True)
    parser.add_argument("--frame-height", type=int, required=True)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    sheet = normalize_cells(source, args.columns, args.rows, args.frame_width, args.frame_height)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out, optimize=True)


if __name__ == "__main__":
    main()

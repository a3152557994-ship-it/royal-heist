#!/usr/bin/env python3
"""Composites Royal Heist v5.0 real-3D promo covers and 9:16 vertical videos from captured WebGL frames.

Outputs into BOTH ./release/ and /Users/wang/OPC/media/20261127-royal-heist/:
  - icon-512.png (512x512)
  - poster-4x3.jpg (1200x900)
  - xianyu-cover-1x1.png (1080x1080)
  - xiaohongshu-cover-3x4.png (1080x1440)
  - 01_实机潜行_夜探和珅王府_9x16.mp4 (1080x1920, 25fps, H.264 + AAC nocturnal score)
  - 02_实机开箱_爆大红塞包撤离_9x16.mp4 (1080x1920, 25fps, H.264 + AAC nocturnal score)
  - 03_真3D实景_三图联展秒玩_9x16.mp4 (1080x1920, 25fps, H.264 + AAC nocturnal score)
"""

import math
import shutil
import struct
import subprocess
import sys
import wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
RAW = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/rh-v5-media-raw")
RELEASE = ROOT / "release"
MEDIA_OUT = Path("/Users/wang/OPC/media/20261127-royal-heist")
ASSETS = ROOT / "public" / "assets"
FFMPEG = "/Users/wang/.local/bin/ffmpeg"

FONT_BOLD = "/System/Library/Fonts/PingFang.ttc"
FONT_FALLBACK = "/System/Library/Fonts/STHeiti Medium.ttc"


def load_font(size: int, index: int = 2):
    for fp in (FONT_BOLD, FONT_FALLBACK):
        if Path(fp).exists():
            try:
                return ImageFont.truetype(fp, size=size, index=index)
            except Exception:
                return ImageFont.truetype(fp, size=size)
    return ImageFont.load_default()


def draw_centered_text(draw: ImageDraw.ImageDraw, cx: int, y: int, text: str, font, fill, stroke_fill=(8, 10, 18), stroke_w=5):
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=stroke_w)
    tw = bbox[2] - bbox[0]
    draw.text((cx - tw // 2, y), text, font=font, fill=fill, stroke_width=stroke_w, stroke_fill=stroke_fill)


def draw_pill(draw: ImageDraw.ImageDraw, cx: int, y: int, text: str, font, bg_fill, border_fill, text_fill, pad_x=28, pad_y=11):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    w, h = tw + pad_x * 2, th + pad_y * 2 + 4
    x0, y0 = cx - w // 2, y
    draw.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=h // 2, fill=bg_fill, outline=border_fill, width=3)
    draw.text((x0 + pad_x, y0 + pad_y - bbox[1]), text, font=font, fill=text_fill)
    return h


def paste_treasure_cards(canvas: Image.Image, icon_names, y_top: int, card_size: int, gap: int):
    draw = ImageDraw.Draw(canvas)
    total_w = len(icon_names) * card_size + (len(icon_names) - 1) * gap
    x0 = (canvas.width - total_w) // 2
    for i, fname in enumerate(icon_names):
        cx = x0 + i * (card_size + gap)
        draw.rounded_rectangle(
            [cx, y_top, cx + card_size, y_top + card_size],
            radius=22,
            fill=(26, 22, 20, 232),
            outline=(240, 186, 74, 255),
            width=4,
        )
        icon = Image.open(ASSETS / fname).convert("RGBA")
        pad = int(card_size * 0.12)
        icon = ImageOps.contain(icon, (card_size - pad * 2, card_size - pad * 2), Image.Resampling.LANCZOS)
        canvas.paste(icon, (cx + (card_size - icon.width) // 2, y_top + (card_size - icon.height) // 2), icon)


def add_vertical_vignette(img: Image.Image, top_h: int, bot_h: int, top_alpha: int = 215, bot_alpha: int = 230):
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(top_h):
        a = int(top_alpha * (1.0 - y / max(top_h, 1)) ** 1.35)
        od.line([(0, y), (w, y)], fill=(7, 10, 18, a))
    for y in range(h - bot_h, h):
        t = (y - (h - bot_h)) / max(bot_h, 1)
        a = int(bot_alpha * (t ** 1.25))
        od.line([(0, y), (w, y)], fill=(7, 10, 18, a))
    return Image.alpha_composite(img.convert("RGBA"), overlay)


def crop_clean_game_frame(path: Path, top_cut=0.14, bot_cut=0.18) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    return im.crop((0, int(h * top_cut), w, int(h * (1.0 - bot_cut))))


def build_covers():
    # Stills are captured HUD-free; only trim tiny top header height band so full 3D canvas shines!
    lobby = crop_clean_game_frame(RAW / "still_lobby_4x3.png", 0.08, 0.02)
    courtyard = crop_clean_game_frame(RAW / "still_courtyard_4x3.png", 0.08, 0.02)
    action = crop_clean_game_frame(RAW / "still_action_4x3.png", 0.08, 0.02)
    pier = crop_clean_game_frame(RAW / "still_pier_4x3.png", 0.08, 0.02)
    vert_court = crop_clean_game_frame(RAW / "still_vertical_courtyard.png", 0.08, 0.02)

    # 1. poster-4x3.jpg (1200x900)
    poster = ImageOps.fit(courtyard, (1200, 900), Image.Resampling.LANCZOS)
    poster = add_vertical_vignette(poster, 260, 290, 210, 235)
    d = ImageDraw.Draw(poster)
    draw_pill(d, 600, 34, "Blender 精模 + 真 PBR 光影 · 潜行搜打撤", load_font(26, 2), (146, 28, 32, 240), (245, 195, 76, 255), (255, 244, 214))
    draw_centered_text(d, 600, 102, "夜探王府：摸金撤离", load_font(84, 2), (255, 250, 236), (10, 12, 18), 8)
    draw_centered_text(d, 600, 622, "避锦衣卫提灯 ◆ 撬金丝楠木暗墙 ◆ 开龙柜爆大红登船撤离", load_font(28, 2), (254, 232, 165), (8, 10, 16), 4)
    paste_treasure_cards(poster, ["tr_imperial_seal.webp", "tr_gold_buddha.webp", "tr_phoenix_crown.webp", "tr_emerald_cabbage.webp"], 682, 174, 46)
    poster.convert("RGB").save(RELEASE / "poster-4x3.jpg", "JPEG", quality=92)

    # 2. icon-512.png (512x512)
    icon_bg = ImageOps.fit(pier, (512, 512), Image.Resampling.LANCZOS)
    icon_bg = add_vertical_vignette(icon_bg, 90, 200, 150, 235)
    seal = Image.open(ASSETS / "tr_imperial_seal.webp").convert("RGBA")
    seal = ImageOps.contain(seal, (172, 172), Image.Resampling.LANCZOS)
    icon_bg.paste(seal, (324, 34), seal)
    d = ImageDraw.Draw(icon_bg)
    d.rounded_rectangle([12, 12, 500, 500], radius=68, outline=(245, 190, 66, 255), width=8)
    draw_centered_text(d, 256, 336, "夜探王府", load_font(86, 2), (255, 246, 218), (10, 12, 18), 8)
    draw_pill(d, 256, 442, "真3D潜行搜打撤", load_font(26, 2), (162, 26, 30, 245), (245, 195, 76, 255), (255, 245, 220), pad_x=24, pad_y=6)
    icon_bg.save(RELEASE / "icon-512.png", "PNG")

    # 3. xiaohongshu-cover-3x4.png (1080x1440)
    xhs = ImageOps.fit(vert_court, (1080, 1440), Image.Resampling.LANCZOS)
    xhs = add_vertical_vignette(xhs, 390, 390, 225, 240)
    d = ImageDraw.Draw(xhs)
    draw_pill(d, 540, 52, "真 3D 精模实机 · 手机电脑点开秒玩", load_font(32, 2), (156, 24, 30, 242), (245, 195, 76, 255), (255, 246, 220), pad_x=34, pad_y=12)
    draw_centered_text(d, 540, 142, "夜探和珅王府", load_font(104, 2), (255, 251, 240), (10, 12, 18), 9)
    draw_centered_text(d, 540, 264, "撬暗墙爆传世大红！", load_font(84, 2), (250, 194, 58), (14, 10, 8), 8)
    draw_centered_text(d, 540, 1096, "躲锦衣卫提灯 ◆ 俄罗斯方块塞包 ◆ 乌篷船撤离", load_font(34, 2), (255, 244, 216), (8, 10, 16), 5)
    paste_treasure_cards(xhs, ["tr_imperial_seal.webp", "tr_gold_buddha.webp", "tr_phoenix_crown.webp", "tr_emerald_cabbage.webp"], 1168, 206, 38)
    xhs.save(RELEASE / "xiaohongshu-cover-3x4.png", "PNG")

    # 4. xianyu-cover-1x1.png (1080x1080) — 3-panel real v5.0 3D collage!
    xy = Image.new("RGBA", (1080, 1080), (10, 14, 22, 255))
    top_panel = ImageOps.fit(lobby, (1080, 560), Image.Resampling.LANCZOS)
    top_panel = add_vertical_vignette(top_panel, 260, 80, 215, 140)
    bot_l = ImageOps.fit(pier, (536, 512), Image.Resampling.LANCZOS)
    bot_r = ImageOps.fit(action, (536, 512), Image.Resampling.LANCZOS)
    bot_l = add_vertical_vignette(bot_l, 40, 230, 60, 225)
    bot_r = add_vertical_vignette(bot_r, 40, 230, 60, 225)
    xy.paste(top_panel, (0, 0))
    xy.paste(bot_l, (0, 568))
    xy.paste(bot_r, (544, 568))
    d = ImageDraw.Draw(xy)
    d.rectangle([0, 560, 1080, 568], fill=(245, 188, 62, 255))
    d.rectangle([536, 568, 544, 1080], fill=(245, 188, 62, 255))
    draw_pill(d, 540, 30, "v5.0 Blender 精模 + 真 PBR 光影 · 免下载秒玩", load_font(28, 2), (156, 24, 30, 242), (245, 195, 76, 255), (255, 246, 220), pad_x=30, pad_y=10)
    draw_centered_text(d, 540, 108, "夜探王府 · 摸金撤离", load_font(86, 2), (255, 251, 240), (10, 12, 18), 8)
    draw_centered_text(d, 540, 212, "实机真 3D 画面直出 ｜ 绝非扁平积木小游戏", load_font(34, 2), (252, 224, 138), (10, 12, 18), 5)
    paste_treasure_cards(xy, ["tr_imperial_seal.webp", "tr_gold_buddha.webp", "tr_phoenix_crown.webp"], 756, 174, 56)
    draw_pill(d, 540, 962, "大内总管金手指永久版 ◆ 24h 自动发货", load_font(36, 2), (245, 178, 42, 255), (255, 248, 224, 255), (22, 14, 8), pad_x=44, pad_y=12)
    xy.save(RELEASE / "xianyu-cover-1x1.png", "PNG")
    print("ALL_4_COVERS_COMPOSED")


def synth_nocturnal_bgm(out_wav: Path, duration_sec: float = 11.5, seed_shift: int = 0):
    """Synthesizes a crisp, atmospheric Chinese pentatonic nocturnal stealth plucked+drum loop (44.1kHz stereo)."""
    sr = 44100
    n = int(sr * duration_sec)
    # D minor pentatonic frequencies (D3, F3, G3, A3, C4, D4, F4, A4)
    scale = [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 440.00]
    melody = [0, 3, 5, 3, 2, 4, 3, 1, 0, 5, 7, 5, 4, 3, 2, 0]
    melody = melody[seed_shift:] + melody[:seed_shift]
    step_sec = 0.36
    samples = bytearray()
    for i in range(n):
        t = i / sr
        env_master = min(1.0, t / 0.4) * min(1.0, (duration_sec - t) / 0.6)
        # Deep nocturnal palace drone (D2 + A2 fifth)
        drone = 0.12 * math.sin(math.tau * 73.42 * t) + 0.06 * math.sin(math.tau * 110.0 * t)
        # Plucked guzheng-style pentatonic note
        step_idx = int(t / step_sec)
        local_t = t - step_idx * step_sec
        freq = scale[melody[step_idx % len(melody)]]
        pluck_env = math.exp(-local_t * 7.5)
        pluck = pluck_env * (
            0.22 * math.sin(math.tau * freq * local_t)
            + 0.09 * math.sin(math.tau * freq * 2.0 * local_t)
            + 0.04 * math.sin(math.tau * freq * 3.0 * local_t)
        )
        # Subtle woodblock / watchman drum beat every 2 steps
        drum_t = t % (step_sec * 2.0)
        drum = 0.18 * math.exp(-drum_t * 22.0) * math.sin(math.tau * (95.0 - 45.0 * min(drum_t * 8.0, 1.0)) * drum_t)
        val = max(-0.92, min(0.92, (drone + pluck + drum) * env_master))
        s16 = int(val * 28000)
        samples += struct.pack("<hh", s16, s16)
    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(bytes(samples))


def build_framed_video(clip_dir: Path, out_mp4: Path, badge: str, title: str, subtitle: str, footer_pill: str, seed_shift: int):
    frames = sorted(clip_dir.glob("f_*.jpg"))
    if not frames:
        raise RuntimeError(f"No frames in {clip_dir}")

    # Create a 1080x1920 RGBA frame template (top title banner + bottom CTA bar + crisp gold border around gameplay)
    overlay = Image.new("RGBA", (1080, 1920), (8, 12, 20, 255))
    d = ImageDraw.Draw(overlay)
    # Cut transparent viewport window in center (y=260..1690, matching 1080x1430 scaled gameplay!)
    # Gameplay frames are 1080x1520 (540x760 @ 2x) -> place cleanly at y=220..1740!
    d.rectangle([0, 224, 1080, 1744], fill=(0, 0, 0, 0))
    d.rectangle([0, 218, 1080, 224], fill=(242, 185, 62, 255))
    d.rectangle([0, 1744, 1080, 1750], fill=(242, 185, 62, 255))

    draw_pill(d, 540, 24, badge, load_font(26, 2), (156, 24, 30, 245), (245, 195, 76, 255), (255, 246, 220), pad_x=26, pad_y=7)
    draw_centered_text(d, 540, 82, title, load_font(62, 2), (255, 250, 236), (6, 8, 14), 6)
    draw_centered_text(d, 540, 160, subtitle, load_font(28, 2), (250, 216, 130), (6, 8, 14), 4)

    draw_pill(d, 540, 1776, footer_pill, load_font(30, 2), (242, 168, 32, 255), (255, 246, 214, 255), (18, 12, 6), pad_x=38, pad_y=9)
    draw_centered_text(d, 540, 1856, "Blender 精模 + 真 PBR 光影 · 手机电脑点开秒玩", load_font(26, 2), (206, 218, 234), (6, 8, 14), 3)

    ov_path = RAW / f"ov_{out_mp4.stem}.png"
    overlay.save(ov_path, "PNG")

    # Compute source fps so clip plays cleanly around 10.5s
    target_dur = 10.5
    src_fps = max(6.0, min(25.0, len(frames) / target_dur))
    wav_path = RAW / f"bgm_{out_mp4.stem}.wav"
    synth_nocturnal_bgm(wav_path, duration_sec=target_dur + 0.5, seed_shift=seed_shift)

    cmd = [
        FFMPEG,
        "-y",
        "-framerate",
        f"{src_fps:.3f}",
        "-i",
        str(clip_dir / "f_%04d.jpg"),
        "-i",
        str(ov_path),
        "-i",
        str(wav_path),
        "-filter_complex",
        "[0:v]scale=1080:1520:flags=lanczos,pad=1080:1920:0:224:color=#080c14[bg];[bg][1:v]overlay=0:0,fps=25,format=yuv420p[v]",
        "-map",
        "[v]",
        "-map",
        "2:a",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "21",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-shortest",
        str(out_mp4),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"ENCODED {out_mp4.name}: {out_mp4.stat().st_size} bytes ({len(frames)} src frames @ {src_fps:.1f}fps)")


def main():
    RELEASE.mkdir(parents=True, exist_ok=True)
    MEDIA_OUT.mkdir(parents=True, exist_ok=True)

    build_covers()

    videos = [
        (
            "clip01_stealth",
            "01_实机潜行_夜探和珅王府_9x16.mp4",
            "真 3D 精模实机录屏 · 绝非贴图滤镜",
            "夜探和珅王府摸大红",
            "避提灯锦衣卫 ◆ 撒碎银引怪 ◆ 迷魂烟脱身",
            "打开即玩免下载 ◆ 夜探王府：摸金撤离",
            0,
        ),
        (
            "clip02_loot",
            "02_实机开箱_爆大红塞包撤离_9x16.mp4",
            "搜打撤爽感拉满 · 实机开箱撤离",
            "撬开龙柜爆传世大红！",
            "俄罗斯方块塞满乾坤包 ◆ 冲回乌篷船落袋",
            "手机电脑免下载秒玩 ◆ 零门槛全地图免费体验",
            4,
        ),
        (
            "clip03_maps",
            "03_真3D实景_三图联展秒玩_9x16.mp4",
            "v5.0 Blender 精模 + 真 PBR 光影",
            "三大清代宫廷禁地实景",
            "盐运司衙门 ◆ 和珅王府 ◆ 紫禁内务府皇库",
            "点开网页 60 帧直玩 ◆ 三图全开放",
            8,
        ),
    ]
    for clip_dir, fname, badge, title, sub, footer, shift in videos:
        build_framed_video(RAW / clip_dir, RELEASE / fname, badge, title, sub, footer, shift)

    # Sync all 4 covers + 3 videos into /Users/wang/OPC/media/20261127-royal-heist/
    for fname in [
        "icon-512.png",
        "poster-4x3.jpg",
        "xianyu-cover-1x1.png",
        "xiaohongshu-cover-3x4.png",
        "01_实机潜行_夜探和珅王府_9x16.mp4",
        "02_实机开箱_爆大红塞包撤离_9x16.mp4",
        "03_真3D实景_三图联展秒玩_9x16.mp4",
    ]:
        shutil.copy2(RELEASE / fname, MEDIA_OUT / fname)
    print("ALL_V5_MEDIA_SYNCED")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Extract candidate audio transients without claiming lyric or beat alignment."""

from __future__ import annotations

import argparse
import hashlib
import math
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np


def run_json(command: list[str]) -> dict:
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def describe_audio(path: Path) -> dict:
    result = run_json(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type,codec_name,sample_rate,channels",
            "-of",
            "json",
            str(path),
        ]
    )
    audio_stream = next(
        (stream for stream in result.get("streams", []) if stream.get("codec_type") == "audio"),
        None,
    )
    if audio_stream is None:
        raise ValueError("INPUT_HAS_NO_AUDIO_STREAM")
    return {
        "duration_seconds": float(result["format"]["duration"]),
        "codec": audio_stream.get("codec_name"),
        "sample_rate_hz": int(audio_stream["sample_rate"]),
        "channels": int(audio_stream["channels"]),
    }


def decode_mono(path: Path, sample_rate: int) -> np.ndarray:
    result = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(path),
            "-map",
            "0:a:0",
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(sample_rate),
            "-f",
            "f32le",
            "pipe:1",
        ],
        check=True,
        capture_output=True,
    )
    samples = np.frombuffer(result.stdout, dtype="<f4").astype(np.float32, copy=False)
    if samples.size == 0:
        raise ValueError("DECODED_AUDIO_EMPTY")
    return samples


def local_peaks(signal: np.ndarray, sample_rate: int, hop: int) -> list[dict]:
    # Centered 46 ms Hann windows and a 10 ms hop preserve useful attack timing.
    window_size = 1024
    padded = np.pad(signal, (window_size // 2, window_size // 2))
    frame_count = math.ceil(signal.size / hop)
    if frame_count < 3:
        raise ValueError("AUDIO_TOO_SHORT_FOR_ANALYSIS")
    frames = np.lib.stride_tricks.sliding_window_view(padded, window_size)[::hop][:frame_count]
    window = np.hanning(window_size).astype(np.float32)
    spectrum = np.abs(np.fft.rfft(frames * window, axis=1)).astype(np.float32)
    spectrum /= np.maximum(spectrum.sum(axis=1, keepdims=True), 1e-8)
    flux = np.maximum(spectrum[1:] - spectrum[:-1], 0).sum(axis=1)
    flux = np.pad(flux, (1, 0))

    radius = max(1, round(0.5 * sample_rate / hop))
    candidates: list[tuple[float, int]] = []
    for index in range(1, len(flux) - 1):
        if flux[index] < flux[index - 1] or flux[index] < flux[index + 1]:
            continue
        left = max(0, index - radius)
        right = min(len(flux), index + radius + 1)
        neighborhood = flux[left:right]
        median = float(np.median(neighborhood))
        mad = float(np.median(np.abs(neighborhood - median)))
        threshold = median + max(4.0 * 1.4826 * mad, 0.015)
        if float(flux[index]) >= threshold:
            candidates.append((float(flux[index]), index))

    # Keep the strongest peak in a 100 ms neighborhood; all remain unverified candidates.
    selected: list[tuple[float, int]] = []
    min_gap = max(1, round(0.1 * sample_rate / hop))
    for strength, index in sorted(candidates, reverse=True):
        if all(abs(index - kept_index) >= min_gap for _, kept_index in selected):
            selected.append((strength, index))
    selected.sort(key=lambda item: item[1])
    maximum = max((strength for strength, _ in selected), default=1.0)
    return [
        {
            "time_seconds": round(index * hop / sample_rate, 4),
            "timeline_frame_24fps": round(index * hop / sample_rate * 24, 3),
            "strength_relative": round(strength / maximum, 4),
            "kind": "spectral_flux_peak_candidate",
            "status": "UNVERIFIED_LISTENING_REQUIRED",
        }
        for strength, index in selected[:500]
    ]


def lyric_ids(beat_map: Path | None) -> list[str]:
    if beat_map is None or not beat_map.exists():
        return []
    return sorted(set(re.findall(r"\bLYR-\d+R?\b", beat_map.read_text(encoding="utf-8"))))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Immutable master audio file")
    parser.add_argument("--output", required=True, type=Path, help="JSON marker map path")
    parser.add_argument(
        "--beat-map",
        type=Path,
        default=None,
        help="Optional lyric-ID source document (no project-specific default)",
    )
    parser.add_argument("--analysis-rate", type=int, default=22050)
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error(f"audio input does not exist: {args.input}")
    if args.analysis_rate < 8000:
        parser.error("--analysis-rate must be at least 8000 Hz")

    metadata = describe_audio(args.input)
    samples = decode_mono(args.input, args.analysis_rate)
    hop = round(args.analysis_rate * 0.01)
    markers = local_peaks(samples, args.analysis_rate, hop)
    sha256 = hashlib.sha256(args.input.read_bytes()).hexdigest()
    ids = lyric_ids(args.beat_map)
    payload = {
        "schema_version": 1,
        "analysis_status": "CANDIDATE_TRANSIENTS_ONLY",
        "source": {
            "basename": args.input.name,
            "sha256": sha256,
            **metadata,
        },
        "method": {
            "implementation": "scripts/analyze_master_audio.py",
            "analysis_rate_hz": args.analysis_rate,
            "hop_seconds": round(hop / args.analysis_rate, 6),
            "window_ms": round(1024 / args.analysis_rate * 1000, 2),
            "peak_rule": "local spectral-flux maximum above median + 4*MAD (or fixed floor), with 100 ms suppression",
            "limitations": [
                "transient candidates are not verified kicks, snares, or musical downbeats",
                "no local ASR or vocal activity model is installed; lyric boundaries remain unverified",
                "timeline frames are a coordinate conversion only, not approved edit cutpoints",
            ],
        },
        "candidate_transients": markers,
        "vocal_phrases": {
            "status": "UNVERIFIED_NO_LOCAL_ASR",
            "lyric_ids": [
                {"lyric_id": lyric_id, "start_seconds": None, "end_seconds": None}
                for lyric_id in ids
            ],
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {len(markers)} unverified transient candidates for {metadata['duration_seconds']:.3f}s audio; "
        f"{len(ids)} lyric IDs remain unaligned. SHA-256: {sha256}"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, subprocess.CalledProcessError, ValueError, json.JSONDecodeError) as exc:
        print(f"audio analysis failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

# py/pv_ephemeral_ids/generator.py

# PORTED BY CHATGPT, NOT TESTED

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Optional

from transformers import AutoTokenizer

DEBUG_LOG = False
CACHE_VERSION = 2
BASE_TEXT = "Test Test"

BASE_CONTEXTS = [
    {"prefix": " ", "suffix": ""},
    {"prefix": ": ", "suffix": ""},
    {"prefix": ": ", "suffix": "."},
    {"prefix": ": ", "suffix": ","},
    {"prefix": ": ", "suffix": "!"},
    {"prefix": " ", "suffix": "-"},
    {"prefix": " ", "suffix": ";"},
    {"prefix": " ", "suffix": ":"},
]

ALT_CONTEXTS = [
    {"prefix": " @", "suffix": ""},
    {"prefix": " #", "suffix": ""},
    {"prefix": " ,", "suffix": ""},
    {"prefix": ' "', "suffix": '"'},
    {"prefix": " '", "suffix": "'"},
    {"prefix": " (", "suffix": ")"},
    {"prefix": " <", "suffix": ">"},
    {"prefix": " [", "suffix": "]"},
    {"prefix": " {", "suffix": "}"},
    {"prefix": " -", "suffix": "-"},
    {"prefix": " ,", "suffix": ","},
    {"prefix": " _", "suffix": "_"},
]

BANNED = {
    **{c*2: True for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    **{w: True for w in [
        "Am", "An", "As", "At", "Be", "By", "Do", "Go", "He", "If", "In", "Is", "It",
        "Me", "My", "No", "Of", "On", "Or", "So", "To", "Up", "Us", "We", "Id"
    ]},
    **{c*3: True for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
}

ALPHA_UPPER = [chr(65 + i) for i in range(26)]
ALPHA_LOWER = [chr(97 + i) for i in range(26)]
NUMERIC = [str(i) for i in range(10)]


def sanitize(name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9_-]', '-', name)


def get_cache_dir() -> Path:
    return Path(__file__).resolve().parent.parent / ".cache" / "pv-ephemeral-ids"


def make_cache_key(model_repo: str, prefix: str = "", long: bool = False) -> str:
    parts = [
        f"model-{sanitize(model_repo.replace('/', '--'))}",
        f"prefix-{sanitize(prefix)}" if prefix else None,
        "long-true" if long else None,
        f"v{CACHE_VERSION}"
    ]
    return "--".join(filter(None, parts)) + ".json"


def try_load_cache(model_repo: str, prefix: str, long: bool) -> Optional[dict]:
    file = get_cache_dir() / make_cache_key(model_repo, prefix, long)
    try:
        with open(file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def save_cache(model_repo: str, prefix: str, long: bool, data: dict):
    dir_path = get_cache_dir()
    dir_path.mkdir(parents=True, exist_ok=True)
    file = dir_path / make_cache_key(model_repo, prefix, long)
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def tokenize(tokenizer, text: str) -> List[int]:
    return tokenizer(text, add_special_tokens=False)["input_ids"]


def contains_triple(tokens: List[int], triple: List[int]) -> bool:
    for i in range(len(tokens) - 2):
        if tokens[i:i+3] == triple:
            return True
    return False


def generate_id_map(model_repo: str, prefix: str = "", long: bool = False, cache: bool = True) -> Dict[str, List[str]]:
    if cache:
        cached = try_load_cache(model_repo, prefix, long)
        if cached:
            if DEBUG_LOG:
                print("✅ Loaded ID map from cache")
            return cached

    tokenizer = AutoTokenizer.from_pretrained(model_repo)

    base_tokens = tokenize(tokenizer, f"{BASE_TEXT} {prefix}" if prefix else BASE_TEXT)
    alt_tokens = tokenize(tokenizer, f"{BASE_TEXT}{ALT_CONTEXTS[0]['prefix']}{prefix}")

    partial_alt_tokens = alt_tokens[:len(base_tokens) - 1 if prefix else len(base_tokens)]
    if partial_alt_tokens != base_tokens[:len(partial_alt_tokens)]:
        raise ValueError("Base and alt contexts do not match. Prefix may be more than one token.")

    result = {}

    for au in ALPHA_UPPER:
        for al in ALPHA_LOWER:
            for ax in (ALPHA_LOWER if long else [""]):
                starter = au + al + ax
                if starter in BANNED:
                    continue

                test_base = tokenize(tokenizer, f"{BASE_TEXT} {prefix}{starter}")
                test_alt = tokenize(tokenizer, f"{BASE_TEXT}{ALT_CONTEXTS[0]['prefix']}{prefix}{starter}")

                if len(test_base) != len(base_tokens) + 1 or test_base[:len(base_tokens)] != base_tokens:
                    continue
                if len(test_alt) != len(alt_tokens) + 1 or test_alt[:len(alt_tokens)] != alt_tokens:
                    continue

                base_starter_token = test_base[-1]
                alt_starter_token = test_alt[-1]

                if prefix and base_starter_token != alt_starter_token:
                    continue

                suffixes = []

                for digit in NUMERIC:
                    for lower in ALPHA_LOWER:
                        full_id = f"{starter}{digit}{lower}"

                        full_base = tokenize(tokenizer, f"{BASE_TEXT} {prefix}{full_id}")
                        full_alt = tokenize(tokenizer, f"{BASE_TEXT}{ALT_CONTEXTS[0]['prefix']}{prefix}{full_id}")

                        base_prefix_len = len(test_base)
                        alt_prefix_len = len(test_alt)

                        if (
                            len(full_base) != base_prefix_len + 2 or
                            len(full_alt) != alt_prefix_len + 2 or
                            full_base[:base_prefix_len] != test_base or
                            full_alt[:alt_prefix_len] != test_alt
                        ):
                            continue

                        triple_base = full_base[base_prefix_len - 1:base_prefix_len + 2]
                        triple_alt = full_alt[alt_prefix_len - 1:alt_prefix_len + 2]

                        if len(triple_base) != 3 or len(triple_alt) != 3:
                            continue

                        if triple_base[0] != base_starter_token or triple_alt[0] != alt_starter_token:
                            continue

                        valid = all(
                            contains_triple(tokenize(tokenizer, f"{BASE_TEXT}{ctx['prefix']}{prefix}{full_id}{ctx['suffix']}"), triple_base)
                            for ctx in BASE_CONTEXTS
                        ) and all(
                            contains_triple(tokenize(tokenizer, f"{BASE_TEXT}{ctx['prefix']}{prefix}{full_id}{ctx['suffix']}"), triple_alt)
                            for ctx in ALT_CONTEXTS
                        )

                        if valid:
                            suffixes.append(digit + lower)

                if suffixes:
                    result[prefix + starter] = suffixes

    if cache:
        save_cache(model_repo, prefix, long, result)
        if DEBUG_LOG:
            print("💾 Saved ID map to cache")

    return result

# end of file
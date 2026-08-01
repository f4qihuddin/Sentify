import json
import re
import string
from pathlib import Path

from nltk.tokenize import word_tokenize

BASE_DIR = Path(__file__).resolve().parent
ARTIFACT_DIR = BASE_DIR / "artifacts"

with open(
    ARTIFACT_DIR / "slang_words.json",
    encoding="utf-8",
) as file:
    SLANG_WORDS = json.load(file)

with open(
    ARTIFACT_DIR / "stopwords.json",
    encoding="utf-8",
) as file:
    STOPWORDS = set(json.load(file))


def remove_emojis(text: str) -> str:
    return re.sub(r"[^\x00-\x7F]+", "", text)


def cleaning_text(text: str) -> str:
    text = remove_emojis(text)
    text = re.sub(r"@[A-Za-z0-9]+", "", text)
    text = re.sub(r"#[A-Za-z0-9]+", "", text)
    text = re.sub(r"RT[\s]", "", text)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[0-9]+", "", text)
    text = re.sub(r"[^\w\s]", "", text)

    text = text.replace("\n", " ")
    text = text.translate(
        str.maketrans("", "", string.punctuation)
    )

    return text.strip()


def fix_slangwords(text: str) -> str:
    words = text.split()

    normalized_words = [
        SLANG_WORDS.get(word.lower(), word)
        for word in words
    ]

    return " ".join(normalized_words)


def preprocess_review(text: str) -> str:
    # Urutannya harus sama dengan notebook.
    text = cleaning_text(text)
    text = text.lower()
    text = fix_slangwords(text)

    tokens = word_tokenize(text)

    filtered_tokens = [
        token
        for token in tokens
        if token not in STOPWORDS
    ]

    return " ".join(filtered_tokens)
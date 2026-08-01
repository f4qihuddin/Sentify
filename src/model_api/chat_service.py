import json
import os
import re
from pathlib import Path

import pandas as pd
from ollama import Client


BASE_DIR = Path(__file__).resolve().parent

default_data_dir = BASE_DIR.parent / "data"

DATA_DIR = Path(
    os.getenv("DATA_DIR", str(default_data_dir))
)

DATA_FILES = [
    filename.strip()
    for filename in os.getenv(
        "DATA_FILES",
        "ulasan_tokopedia.csv",
    ).split(",")
    if filename.strip()
]

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434",
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen3:8b",
)

ollama_client = Client(
    host=OLLAMA_BASE_URL,
)


def load_review_data() -> pd.DataFrame:
    frames = []

    for filename in DATA_FILES:
        file_path = DATA_DIR / filename

        if not file_path.exists():
            raise FileNotFoundError(
                f"File data tidak ditemukan: {file_path}"
            )

        dataframe = pd.read_csv(
            file_path,
            usecols=[
                "tahun",
                "review",
                "label",
            ],
        )

        dataframe["tahun"] = pd.to_numeric(
            dataframe["tahun"],
            errors="coerce",
        )

        dataframe["label"] = (
            dataframe["label"]
            .astype(str)
            .str.strip()
            .str.lower()
        )

        dataframe["review"] = (
            dataframe["review"]
            .fillna("")
            .astype(str)
        )

        frames.append(dataframe)

    if not frames:
        raise RuntimeError(
            "Tidak ada dataset review yang berhasil dimuat."
        )

    return pd.concat(
        frames,
        ignore_index=True,
    )


# Data dimuat satu kali ketika server mulai,
# bukan dibaca ulang pada setiap pertanyaan.
reviews_df = load_review_data()

# Tools
def get_sentiment_summary(
    year: int | None = None,
) -> str:
    """
    Menghitung jumlah dan persentase review berdasarkan sentimen.

    Args:
        year: Tahun yang ingin dianalisis. Kosongkan untuk seluruh data.

    Returns:
        Ringkasan jumlah dan persentase sentimen dalam JSON.
    """

    data = reviews_df

    if year is not None:
        data = data[data["tahun"] == year]

    total = len(data)

    if total == 0:
        return json.dumps({
            "year": year,
            "total": 0,
            "message": "Data tidak ditemukan.",
        })

    counts = data["label"].value_counts()

    result = {
        "year": year,
        "total": int(total),
        "sentiments": {},
    }

    for label, count in counts.items():
        result["sentiments"][label] = {
            "count": int(count),
            "percentage": round(
                int(count) / total * 100,
                2,
            ),
        }

    return json.dumps(
        result,
        ensure_ascii=False,
    )

def search_reviews(
    keyword: str,
    label: str = "",
    year: int | None = None,
    limit: int = 8,
) -> str:
    """
    Mencari contoh review berdasarkan kata kunci, sentimen, dan tahun.

    Args:
        keyword: Kata atau frasa yang ingin dicari.
        label: Filter positive atau negative. Boleh kosong.
        year: Filter tahun. Boleh kosong.
        limit: Jumlah maksimal review yang dikembalikan.

    Returns:
        Review yang sesuai dalam JSON.
    """

    data = reviews_df

    if year is not None:
        data = data[data["tahun"] == year]

    if label:
        data = data[
            data["label"] == label.strip().lower()
        ]

    keyword = keyword.strip()

    if keyword:
        pattern = re.escape(keyword)

        data = data[
            data["review"].str.contains(
                pattern,
                case=False,
                na=False,
                regex=True,
            )
        ]

    limit = max(1, min(limit, 20))

    rows = data.head(limit).to_dict(
        orient="records",
    )

    return json.dumps(
        {
            "total_matches": int(len(data)),
            "reviews": rows,
        },
        ensure_ascii=False,
    )

# Ollama Agent
AVAILABLE_TOOLS = {
    "get_sentiment_summary": get_sentiment_summary,
    "search_reviews": search_reviews,
}

TOOLS = list(AVAILABLE_TOOLS.values())


SYSTEM_PROMPT = """
Anda adalah asisten analisis sentimen review sebuah aplikasi e-commerce. Anda bertugas menjawab
pertanyaan pengguna berkaitan dengan data review e-commerce berdasarkan data csv yang tersedia. Anda
harus memanfaatkan tools yang tersedia untuk menjawab pertanyaan pengguna secara akurat.

Jawablah dalam bahasa yang sama dengan bahasa pengguna.

Aturan:
1. Selalu gunakan tool untuk menjawab pertanyaan tentang dataset.
2. Gunakan metrik pada pertanyaan pengguna sebagai parameter fungsi tools
   contoh: "Berapa persentase review positif tahun 2026"
   => gunakan `get_sentiment_summary(year=2026)`
3. Jangan mengarang jumlah, persentase, tahun, atau isi review. 
4. Jika data tidak tersedia, katakan dengan jelas.
5. Bedakan hasil perhitungan data dengan interpretasi.
6. Berikan jawaban ringkas dan mudah dipahami.
7. Jawab dengan bahasa natural, jangan sertakan JSON dalam jawaban
8. Jika terdapat filter pada pertanyaan user gunakan filter tersebut untuk menyaring data, 
jangan menjawab secara keseluruhan. Misalnya jika user menanyakan jumlah review pada
tahun 2024, maka filter data berdasarkan tahun 2024.
"""

def ask_dataset(
    question: str,
    history: list[dict] | None = None,
) -> str:
    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
    ]

    if history:
        messages.extend(history[-10:])

    messages.append({
        "role": "user",
        "content": question,
    })

    # Batasi iterasi agar tool calling tidak berjalan tanpa akhir.
    for _ in range(4):
        response = ollama_client.chat(
            model=OLLAMA_MODEL,
            messages=messages,
            tools=TOOLS,
            options={
                "temperature": 0,
            },
        )

        messages.append(response.message)

        tool_calls = (
            response.message.tool_calls or []
        )

        if not tool_calls:
            return response.message.content

        for tool_call in tool_calls:
            function_name = (
                tool_call.function.name
            )

            function = AVAILABLE_TOOLS.get(
                function_name
            )

            if function is None:
                tool_result = json.dumps({
                    "error": (
                        f"Tool tidak dikenal: "
                        f"{function_name}"
                    ),
                })
            else:
                try:
                    tool_result = function(
                        **tool_call.function.arguments
                    )
                except Exception as error:
                    tool_result = json.dumps({
                        "error": str(error),
                    })

            messages.append({
                "role": "tool",
                "tool_name": function_name,
                "content": tool_result,
            })

    raise RuntimeError(
        "Model melakukan terlalu banyak tool call."
    )
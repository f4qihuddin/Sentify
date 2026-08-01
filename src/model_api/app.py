import os
from pathlib import Path
from typing import Literal

import csv
import threading
from datetime import date

import joblib
import keras
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent

# Harus dilakukan sebelum import chat_service.
load_dotenv(BASE_DIR / ".env")

from preprocessing import preprocess_review
from chat_service import ask_dataset


ARTIFACT_DIR = BASE_DIR / "artifacts"

CHAT_HISTORY_FILE = Path(
    os.getenv(
        "CHAT_HISTORY_FILE",
        str(BASE_DIR.parent / "data" / "chat_history.csv"),
    )
)

chat_history_lock = threading.Lock()

model = keras.saving.load_model(
    ARTIFACT_DIR / "sentiment_model.keras",
    compile=False,
)

tfidf = joblib.load(
    ARTIFACT_DIR / "tfidf_vectorizer.joblib",
)

app = FastAPI(
    title="Tokopedia Sentiment API",
    version="1.0.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Sentiment Classification Model
class PredictionRequest(BaseModel):
    review: str = Field(
        min_length=1,
        max_length=5000,
    )

class PredictionResponse(BaseModel):
    sentiment: str
    confidence: float
    score: float
    processed_review: str

# Ollama Model
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]

    content: str = Field(
        min_length=1,
        max_length=10000,
    )

class ChatRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=2000,
    )

    session_name: str = Field(
        default="Chat Baru",
        min_length=1,
        max_length=100,
    )

    history: list[ChatMessage] = Field(
        default_factory=list,
    )

class ChatResponse(BaseModel):
    answer: str

@app.get("/health")
def health():
    return {
        "status": "healthy",
    }

# Sentiment Classification Model Endpoint
@app.post(
    "/predict",
    response_model=PredictionResponse,
)
def predict_sentiment(
    payload: PredictionRequest,
):
    review = payload.review.strip()

    if not review:
        raise HTTPException(
            status_code=400,
            detail="Review tidak boleh kosong.",
        )

    processed_review = preprocess_review(review)

    if not processed_review:
        raise HTTPException(
            status_code=422,
            detail=(
                "Review tidak memiliki kata yang dapat "
                "digunakan setelah preprocessing."
            ),
        )

    # Transformasi harus menggunakan TF-IDF hasil training,
    # bukan membuat TfidfVectorizer baru.
    review_tfidf = tfidf.transform(
        [processed_review],
    )

    # Dense layer menerima 200 feature.
    model_input = review_tfidf.toarray().astype(
        np.float32,
    )

    prediction = model.predict(
        model_input,
        verbose=0,
    )

    positive_score = float(
        np.asarray(prediction).reshape(-1)[0]
    )

    if positive_score >= 0.5:
        sentiment = "positive"
        confidence = positive_score
    else:
        sentiment = "negative"
        confidence = 1 - positive_score

    return {
        "sentiment": sentiment,
        "confidence": confidence,
        "score": positive_score,
        "processed_review": processed_review,
    }

# Ollama Model Endpoint
@app.post(
    "/chat",
    response_model=ChatResponse,
)
def chat_with_dataset(
    payload: ChatRequest,
):
    question = payload.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Pertanyaan tidak boleh kosong.",
        )

    history = [
        message.model_dump()
        for message in payload.history
    ]

    try:
        # Meminta jawaban dari Ollama.
        answer = ask_dataset(
            question=question,
            history=history,
        )

        # Menyimpan pertanyaan dan jawaban setelah berhasil.
        save_chat_history(
            session_name=payload.session_name.strip(),
            question=question,
            answer=answer,
        )

    except ConnectionError as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Ollama tidak dapat dihubungi. "
                "Pastikan Ollama sedang berjalan."
            ),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Ask AI gagal: {error}",
        ) from error

    return {
        "answer": answer,
    }

# Chat History Endpoint
@app.get("/chat/history")
def get_chat_history():
    if not CHAT_HISTORY_FILE.exists():
        return []

    with chat_history_lock:
        with CHAT_HISTORY_FILE.open(
            mode="r",
            encoding="utf-8",
            newline="",
        ) as csv_file:
            return list(csv.DictReader(csv_file))

def save_chat_history(
    session_name: str,
    question: str,
    answer: str,
) -> None:
    CHAT_HISTORY_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    file_exists = CHAT_HISTORY_FILE.exists()

    with chat_history_lock:
        with CHAT_HISTORY_FILE.open(
            mode="a",
            encoding="utf-8",
            newline="",
        ) as csv_file:
            writer = csv.DictWriter(
                csv_file,
                fieldnames=[
                    "tanggal",
                    "sesi_chat",
                    "pertanyaan_user",
                    "respon_chatbot",
                ],
            )

            if not file_exists:
                writer.writeheader()

            writer.writerow({
                "tanggal": date.today().isoformat(),
                "sesi_chat": session_name,
                "pertanyaan_user": question,
                "respon_chatbot": answer,
            })

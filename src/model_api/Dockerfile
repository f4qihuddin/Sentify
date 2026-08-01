FROM python:3.12-slim

WORKDIR /app

COPY src/model_api/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && python -m nltk.downloader -d /usr/local/share/nltk_data punkt_tab

COPY src/model_api/app.py ./
COPY src/model_api/chat_service.py ./
COPY src/model_api/preprocessing.py ./
COPY src/model_api/artifacts ./artifacts

COPY src/data/ulasan_tokopedia.csv ./data/ulasan_tokopedia.csv

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
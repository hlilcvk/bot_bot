FROM python:3.12-slim

WORKDIR /app

# Gerekli sistem paketlerini kuruyoruz
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Gereksinimleri kopyala ve kur
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Proje dosyalarini kopyala
COPY . .

# FastAPI portu
EXPOSE 8000

# Serveri baslat
CMD ["uvicorn", "bot_server:app", "--host", "0.0.0.0", "--port", "8000"]

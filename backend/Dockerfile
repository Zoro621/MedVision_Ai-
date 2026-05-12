FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

WORKDIR /app

# Build-time flags — defaults false (heavy deps only when needed)
ARG INSTALL_OCR=false
ARG INSTALL_ML=false

# System libs needed for OpenCV (Pillow), libGL, and scikit-image
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Core requirements first (cached layer)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Optional: OCR (PaddleOCR-VL is large)
COPY requirements-ocr.txt ./
RUN if [ "$INSTALL_OCR" = "true" ]; then \
        pip install --no-cache-dir -r requirements-ocr.txt; \
    fi

# Optional: heavy ML (SHAP C extensions)
COPY requirements-ml-extra.txt ./
RUN if [ "$INSTALL_ML" = "true" ]; then \
        pip install --no-cache-dir -r requirements-ml-extra.txt; \
    fi

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.11-slim

# Install system deps needed by pdfplumber / spaCy
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install dependencies first (layer cache)
COPY requiremnents.txt .
RUN pip install --no-cache-dir -r requiremnents.txt

# Copy application code
COPY app.py .
COPY resume_analyzer/ ./resume_analyzer/

# Streamlit config — disable telemetry, set port from $PORT env var
ENV STREAMLIT_SERVER_PORT=8501
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0
ENV STREAMLIT_BROWSER_GATHER_USAGE_STATS=false
ENV STREAMLIT_SERVER_ENABLE_CORS=false
ENV STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=false

# sentence-transformers model cache dir (writable in container)
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
ENV HF_HOME=/app/.cache/huggingface

EXPOSE 8501

# Use $PORT if set by the platform (Render uses PORT env var)
CMD ["sh", "-c", "streamlit run app.py --server.port=${PORT:-8501} --server.address=0.0.0.0"]

FROM python:3.12-slim

# Python 3.12: qiskit-aer==0.15.1 (pinned in backend/requirements.txt) ships no
# cp313 wheel, so pip install failed on the 3.13-slim base. All 48 pinned
# packages verified to resolve as wheels for cp312.

# libgomp1 is required by qiskit-aer (OpenMP threading)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies before copying code for better layer caching
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy application code
COPY backend/ ./backend/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Stage 1: The "builder" stage
FROM python:3.10-slim-bookworm AS builder

WORKDIR /app

# Copy only the requirements file first to leverage Docker layer caching
COPY requirements.txt .

# Install python dependencies without caching to keep the stage lean
RUN pip install --no-cache-dir -r requirements.txt


# Stage 2: The final, lightweight production stage
FROM python:3.10-slim-bookworm

WORKDIR /app

# Copy the installed packages from the "builder" stage
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy your application code (including the 'backend' folder)
COPY . .

# Expose the port your application will run on
EXPOSE 8000

# The command to run your application located in backend/main.py
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
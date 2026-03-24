FROM python:3.12-slim

WORKDIR /app

# Install system deps needed by TensorFlow / scikit-learn
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py ./

EXPOSE 5001

# api_server.py will auto-train the model on first boot if saved_models/ is empty
CMD ["python", "api_server.py"]

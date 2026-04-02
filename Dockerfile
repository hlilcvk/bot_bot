# ───────────────────────────────────────────────────────
#  PROPTREX Radar – Production Dockerfile (Coolify-ready)
# ───────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Prevent .pyc files & enable real-time log output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create a non-root user for security
RUN groupadd --gid 1000 radar && \
    useradd --uid 1000 --gid radar --shell /bin/bash --create-home radar

WORKDIR /app

# Copy application code
COPY --chown=radar:radar . .

# Ensure data directory exists and is writable
RUN mkdir -p /app/data && chown -R radar:radar /app/data

# No pip install needed – project uses only Python standard library

# Switch to non-root user
USER radar

# Expose the application port
EXPOSE 8000

# Health check – polls /api/health every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Persistent volume mount point for SQLite data
VOLUME ["/app/data"]

# Start the server
CMD ["python", "main.py"]

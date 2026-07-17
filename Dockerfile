FROM python:3.11

WORKDIR /app
    
COPY . .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./

EXPOSE 8000
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn", "-k", "eventlet", "-w", "1", "-b", "0.0.0.0:8000", "app.main:app"]

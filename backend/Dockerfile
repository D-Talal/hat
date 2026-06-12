FROM python:3.11-slim
WORKDIR /app

# Install runtime + dev (test) dependencies
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY . .

# Run the test suite during the build. If any test fails, the image build
# fails and Render aborts the deploy — broken code never reaches production.
RUN TESTING=1 pytest -q

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

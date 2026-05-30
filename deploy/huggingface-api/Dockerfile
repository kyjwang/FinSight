FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV KRONOS_ENABLED=true
ENV KRONOS_REPO_PATH=/opt/Kronos
ENV KRONOS_MODEL=NeoQuasar/Kronos-small
ENV KRONOS_TOKENIZER=NeoQuasar/Kronos-Tokenizer-base
ENV KRONOS_DEVICE=cpu

ARG FINSIGHT_REPO=https://github.com/kyjwang/FinSight.git
ARG FINSIGHT_REF=main

RUN apt-get update \
  && apt-get install -y --no-install-recommends git curl \
  && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/shiyu-coder/Kronos.git /opt/Kronos
RUN git clone --depth 1 --branch ${FINSIGHT_REF} ${FINSIGHT_REPO} /app

WORKDIR /app

RUN python -m pip install --upgrade pip \
  && pip install -r services/api/requirements.txt \
  && pip install -r /opt/Kronos/requirements.txt

EXPOSE 7860

CMD ["uvicorn", "services.api.app.main:app", "--host", "0.0.0.0", "--port", "7860"]

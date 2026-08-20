FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      curl \
      git \
      gh \
      gosu \
      openssh-client \
      procps \
      ripgrep \
      tmux \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global @openai/codex@0.148.0

WORKDIR /app

COPY package.json package-lock.json ./
COPY worker/builder-template/package.json worker/builder-template/package-lock.json ./worker/builder-template/
RUN npm ci \
    && npm ci --prefix worker/builder-template \
    && npx playwright install --with-deps chromium \
    && chown -R node:node /app /ms-playwright

COPY --chown=node:node . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SITEFORGE_PREVIEW_ORIGIN
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SITEFORGE_PREVIEW_ORIGIN=$VITE_SITEFORGE_PREVIEW_ORIGIN \
    VITE_SITEFORGE_OPENAI_API_ENABLED=false

USER node

RUN test -n "$VITE_SUPABASE_URL" \
    && test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" \
    && npm run build

USER root

EXPOSE 8080 8787 3000

ENTRYPOINT ["bash", "scripts/railway-entrypoint"]
CMD ["bash", "scripts/start-railway-runtime"]

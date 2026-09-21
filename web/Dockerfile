# syntax=docker/dockerfile:1
# One argument, two effects that must never disagree: the app stops trying to load a distant
# favicon, and the CSP stops allowing one. Both are decided here, at build time (ADR-019).
ARG FAVICONS_DISTANTES=false

# --- Build the PWA ---
FROM node:22.20.0-slim AS build
ARG FAVICONS_DISTANTES
ENV VITE_FAVICONS_DISTANTES=$FAVICONS_DISTANTES
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# The crypto test vectors are not needed to build. `npm run build` draws the logo pack first.
RUN npm run build

# --- Serve it ---
FROM nginx:1.31.0-alpine
ARG FAVICONS_DISTANTES
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf security-headers-favicons.conf /etc/nginx/snippets/
# Keep one policy only, so the image cannot be talked into the other one at runtime.
RUN if [ "$FAVICONS_DISTANTES" = "true" ]; then \
      cp /etc/nginx/snippets/security-headers-favicons.conf /etc/nginx/snippets/security-headers.conf; \
    fi \
    && rm /etc/nginx/snippets/security-headers-favicons.conf \
    && grep -o "img-src[^;]*" /etc/nginx/snippets/security-headers.conf
COPY --from=build /web/dist/ /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/healthz"]

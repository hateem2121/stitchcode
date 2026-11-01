# ------------------------------------------------------------------
# RUN STITCHCODE — two-step recipe:
#   1. bake the studio (Node)
#   2. serve it fast and small (unprivileged nginx, digest-pinned)
# ------------------------------------------------------------------

# Step 1 — the oven (build-time only; tag-pinned is acceptable here)
FROM node:24-alpine AS bake
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Relative paths so the image works behind any sub-path.
RUN npm run build -- --base=./

# Step 2 — the shop window. nginx-unprivileged runs as UID 101 and listens
# on 8080 — no root process anywhere in the final image.
FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=bake /app/dist /usr/share/nginx/html
EXPOSE 8080
USER 101
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

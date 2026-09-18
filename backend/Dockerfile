# Playwright's own image ships Chromium plus every system library it needs
# to actually run headless (~20+ apt packages that are easy to get wrong by
# hand on a slim/alpine base) already matched to this exact Playwright
# version. Pin the version to match package-lock.json exactly -- Playwright
# requires its npm package and browser binary versions to match precisely;
# check `node -e "console.log(require('playwright/package.json').version)"`
# in backend/ if this ever needs bumping after a `npm update`.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app

# Install dependencies first, separately from the source copy below, so
# `docker build` can cache this layer and skip the (slow) npm install on
# every rebuild that only changes application code.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Playwright's image already has a non-root "pwuser" set up with the right
# permissions for its browser cache -- reuse it instead of running the app
# as root, which is unnecessary privilege for a process that only needs to
# read its own source and read/write one data directory.
RUN mkdir -p /app/data/uploads && chown -R pwuser:pwuser /app
USER pwuser

EXPOSE 3001

CMD ["node", "src/index.js"]

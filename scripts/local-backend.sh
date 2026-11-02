#!/usr/bin/env bash
# Sets up a local Convex backend with the test sign-in, for development and
# end-to-end tests. No Convex or Clerk account needed.
set -euo pipefail
cd "$(dirname "$0")/.."
export CONVEX_AGENT_MODE=anonymous

# This sets CLERK_JWT_ISSUER_DOMAIN to `none`, which must never reach a hosted
# deployment. A clone linked to one needs its own worktree for the local backend.
if [ -f .env.local ] && grep -q '^CONVEX_DEPLOYMENT=' .env.local \
  && ! grep -qE '^CONVEX_DEPLOYMENT=(anonymous|local):' .env.local; then
  echo "This clone's .env.local points at a hosted Convex deployment. Run this in a separate worktree." >&2
  exit 1
fi

# The first run creates the local deployment and writes .env.local.
npx convex dev --once --typecheck disable || true
npx convex env set CLERK_JWT_ISSUER_DOMAIN none
npx convex env set BEANS_TEST_AUTH_ISSUER "http://localhost:3000/api/test-auth/"
npx convex dev --once --typecheck disable

if [ ! -f apps/web/.env.local ]; then
  cat > apps/web/.env.local <<ENV
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
NEXT_PUBLIC_BEANS_TEST_AUTH=1
BEANS_TEST_AUTH=1
BEANS_TEST_AUTH_ISSUER=http://localhost:3000/api/test-auth/
ENV
  echo "Wrote apps/web/.env.local for the local backend and test sign-in."
fi
echo "Local backend ready. Keep it running with: pnpm convex:dev"

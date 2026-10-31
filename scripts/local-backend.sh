#!/usr/bin/env bash
# Sets up a local Convex backend with the test sign-in, for development and
# end-to-end tests. No Convex or Clerk account needed.
set -euo pipefail
cd "$(dirname "$0")/.."
export CONVEX_AGENT_MODE=anonymous

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

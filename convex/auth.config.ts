import type { AuthConfig } from "convex/server";

/**
 * Clerk signs users in. Set CLERK_JWT_ISSUER_DOMAIN on the deployment to the
 * Clerk Frontend API URL after turning on Clerk's Convex integration.
 *
 * Local test sign-in: set CLERK_JWT_ISSUER_DOMAIN to `none` and
 * BEANS_TEST_AUTH_ISSUER to the dev server's test issuer. The test issuer is
 * only read when Clerk is off, and only accepted on localhost, which a hosted
 * deployment can't reach. So it can never sign anyone in to production.
 */
const providers: AuthConfig["providers"] = [];

const clerk = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (clerk && clerk !== "none") {
  providers.push({ domain: clerk, applicationID: "convex" });
} else if (clerk === "none") {
  const testIssuer = process.env.BEANS_TEST_AUTH_ISSUER;
  if (testIssuer && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(testIssuer)) {
    providers.push({
      type: "customJwt",
      applicationID: "beans-test",
      issuer: testIssuer,
      jwks: `${testIssuer.replace(/\/$/, "")}/jwks`,
      algorithm: "RS256",
    });
  }
}

export default { providers } satisfies AuthConfig;

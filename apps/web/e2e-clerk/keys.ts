const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const secret = process.env.CLERK_SECRET_KEY ?? "";

/** Only development keys count: this test creates a user, so it must never reach a live instance. */
export const clerkConfigured = publishable.startsWith("pk_test_") && secret.startsWith("sk_test_") && Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

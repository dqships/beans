import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { clerkConfigured } from "./keys";

setup("get a Clerk testing token", async () => {
  setup.skip(!clerkConfigured, "No Clerk development keys in this environment");
  await clerkSetup();
});

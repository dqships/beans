// Creates (or updates) the Stripe customer portal configuration Beans opens,
// so Beans subscribers only ever see the two Beans plans and Vidzilla's
// portal (the account default) stays untouched. Run once per mode:
//
//   STRIPE_SECRET_KEY='rk_live_…' node scripts/stripe-portal-config.mjs --site https://<your domain>
//
// It prints the configuration ID (bpc_…), which goes in
// STRIPE_IDS[mode].portalConfiguration in packages/core/src/billing.ts.
// Running it again updates the same configuration (found by metadata app=beans).
// --dry-run prints the parameters and calls nothing. See docs/BILLING.md.

const STRIPE_VERSION = "2024-06-20";

/** Keep in step with STRIPE_IDS in packages/core/src/billing.ts. */
const PRODUCTS = {
  test: [
    { product: "prod_VYVv3deCpZmo1k", prices: ["price_1UXOuBDyfH6JDnExdLFn4NRD"] },
    { product: "prod_VYW4SHnFpac8kb", prices: ["price_1UXP2qDyfH6JDnExV04uvxl0"] },
  ],
  live: [
    { product: "prod_VYXGevO6K7Zl0T", prices: ["price_1UXQBoDyfH6JDnExCMcFrOqj"] },
    { product: "prod_VYXTt1M6CU6hHQ", prices: ["price_1UXQOLDyfH6JDnExGPJCdM8E"] },
  ],
};

function portalParams(mode, site) {
  return {
    business_profile: {
      headline: "Manage your Beans subscription",
      ...(site ? { privacy_policy_url: `${site}/privacy`, terms_of_service_url: `${site}/terms` } : {}),
    },
    ...(site ? { default_return_url: `${site}/app` } : {}),
    features: {
      customer_update: { enabled: true, allowed_updates: ["email"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        proration_behavior: "none",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "missing_features", "switched_service", "unused", "too_complex", "other"],
        },
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        products: PRODUCTS[mode],
        proration_behavior: "create_prorations",
        // Yearly to monthly waits for the end of the year; a trial carries over a switch.
        schedule_at_period_end: { conditions: [{ type: "decreasing_item_amount" }, { type: "shortening_interval" }] },
        trial_update_behavior: "continue_trial",
      },
    },
    metadata: { app: "beans" },
  };
}

/** Flattens {a: {b: 1}, c: [x]} into Stripe's form encoding, a[b]=1&c[0]=x. */
function formEncode(params, prefix = "", out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") formEncode(value, name, out);
    else out.append(name, String(value));
  }
  return out;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const key = process.env.STRIPE_SECRET_KEY ?? "";
const dryRun = process.argv.includes("--dry-run");
const mode = /^(sk|rk)_live_/.test(key) ? "live" : /^(sk|rk)_test_/.test(key) ? "test" : dryRun ? "live" : null;
if (!mode) {
  console.error("Set STRIPE_SECRET_KEY to a Stripe secret or restricted key (sk_… or rk_…).");
  process.exit(1);
}
const site = arg("--site")?.replace(/\/+$/, "");
if (site !== undefined && !/^https:\/\/[^/]+$/.test(site)) {
  console.error("--site takes the site's origin, like https://example.com");
  process.exit(1);
}

const body = formEncode(portalParams(mode, site));
if (dryRun) {
  console.log(`${mode} mode${site ? "" : ", no --site (no legal links or return URL)"}:\n${[...body].map(([k, v]) => `${k}=${v}`).join("\n")}`);
  process.exit(0);
}

async function stripe(method, path, form) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_VERSION,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Stripe ${res.status}`);
  return json;
}

try {
  const list = await stripe("GET", "/v1/billing_portal/configurations?active=true&limit=100");
  const existing = list.data.find((c) => c.metadata?.app === "beans");
  const config = existing
    ? await stripe("POST", `/v1/billing_portal/configurations/${existing.id}`, body)
    : await stripe("POST", "/v1/billing_portal/configurations", body);
  if (config.is_default) console.warn("Note: this configuration is the account default, so Vidzilla's portal uses it too.");
  console.log(`${existing ? "Updated" : "Created"} the Beans portal configuration (${mode} mode):`);
  console.log(config.id);
} catch (error) {
  console.error(`Stripe refused: ${error.message}`);
  process.exit(1);
}

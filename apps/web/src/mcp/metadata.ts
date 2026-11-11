import { MCP_SCOPES } from "./config";

/** The metadata Beans adds to Clerk's: RFC 9728 names, with the app's pages on `site`. */
export function resourceProperties(site: string) {
  return {
    resource_name: "Beans",
    resource_documentation: `${site}/connect-ai`,
    service_documentation: `${site}/connect-ai`,
    resource_policy_uri: `${site}/privacy`,
    resource_tos_uri: `${site}/terms`,
    scopes_supported: [...MCP_SCOPES],
    bearer_methods_supported: ["header"],
  };
}

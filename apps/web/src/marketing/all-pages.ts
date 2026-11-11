import { toolPages } from "@/tools/registry";
import { publicPageList, type PublicPage } from "./pages";

/**
 * Every public page, the free tools included, for the sitemap and the checks
 * that every page has head tags and a markdown version. It pulls in all the
 * tools' copy, so only server code and tests should import it.
 */
export const allPublicPages: PublicPage[] = [...publicPageList, ...toolPages];

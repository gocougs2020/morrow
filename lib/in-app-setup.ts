import { appConfig } from "../app.config";

/** When false, `/settings/setup` 404s and Setup links are hidden. */
export function isInAppSetupEnabled(): boolean {
  return appConfig.setup.inAppPage;
}

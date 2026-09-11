import { createGoogleCsrfHandler } from "@onyx/google-workspace-server-runtime";
import { createGoogleRouteHandler } from "./google-runtime-entry";
export const handler = createGoogleRouteHandler(createGoogleCsrfHandler);
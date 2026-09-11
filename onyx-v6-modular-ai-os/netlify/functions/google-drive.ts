import { createGoogleDriveHandler } from "@onyx/google-workspace-server-runtime";
import { createGoogleRouteHandler } from "./google-runtime-entry";
export const handler = createGoogleRouteHandler(createGoogleDriveHandler);
/**
 * This file was auto-generated by @openapi-qraft/cli.
 * Do not make direct changes to the file.
 */

import { qraftAPIClient, QraftClientOptions, callbacks } from "@openapi-qraft/react";
import { services, Services } from "./services/index.js";
export function createAPIClient(options?: QraftClientOptions): Services {
    return qraftAPIClient<Services, typeof callbacks>(services, callbacks, options);
}

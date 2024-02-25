import { composeInfiniteQueryKey } from '../lib/composeInfiniteQueryKey.js';
import type { QraftClientOptions } from '../qraftAPIClient.js';
import type { RequestClientSchema } from '../RequestClient.js';
import { ServiceOperationQuery } from '../ServiceOperation.js';

export const getInfiniteQueryKey = (
  qraftOptions: QraftClientOptions | undefined,
  schema: RequestClientSchema,
  args: Parameters<
    ServiceOperationQuery<
      RequestClientSchema,
      unknown,
      unknown
    >['getInfiniteQueryKey']
  >
) => {
  return composeInfiniteQueryKey(schema, args[0]);
};

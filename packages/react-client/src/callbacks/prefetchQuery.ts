import type { CreateAPIQueryClientOptions } from '../qraftAPIClient.js';
import type { ServiceOperationFetchQuery } from '../service-operation/ServiceOperationFetchQuery.js';
import { callQueryClientMethodWithQueryKey } from '../lib/callQueryClientFetchMethod.js';

export const prefetchQuery: <
  TSchema extends { url: string; method: 'get' | 'head' | 'options' },
  TData,
  TParams,
>(
  qraftOptions: CreateAPIQueryClientOptions,
  schema: TSchema,
  args: Parameters<
    ServiceOperationFetchQuery<TSchema, TData, TParams>['prefetchQuery']
  >
) => Promise<TData> = (qraftOptions, schema, args) => {
  return callQueryClientMethodWithQueryKey(
    qraftOptions,
    'prefetchQuery',
    schema,
    false,
    args as never
  ) as never;
};

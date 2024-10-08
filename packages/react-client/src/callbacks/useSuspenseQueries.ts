'use client';

import type { SuspenseQueriesResults } from '@tanstack/react-query';
import type { OperationSchema } from '../lib/requestFn.js';
import type { CreateAPIQueryClientOptions } from '../qraftAPIClient.js';
import type { ServiceOperationQuery } from '../service-operation/ServiceOperation.js';
import { useSuspenseQueries as useSuspenseQueriesTanstack } from '@tanstack/react-query';
import { composeQueryKey } from '../lib/composeQueryKey.js';
import { requestFnResponseResolver } from '../lib/requestFnResponseResolver.js';

export const useSuspenseQueries: (
  qraftOptions: CreateAPIQueryClientOptions,
  schema: OperationSchema,
  args: Parameters<
    ServiceOperationQuery<
      OperationSchema,
      unknown,
      unknown
    >['useSuspenseQueries']
  >
) => SuspenseQueriesResults<never> = (qraftOptions, schema, args) => {
  const [options] = args;

  return useSuspenseQueriesTanstack(
    {
      ...options,
      queries: options.queries.map((queryOptions) => {
        const optionsWithQueryKey =
          'parameters' in queryOptions
            ? (() => {
                const queryOptionsCopy = Object.assign(
                  {
                    queryKey: composeQueryKey(schema, queryOptions.parameters),
                  },
                  queryOptions
                );
                delete queryOptionsCopy.parameters;
                return queryOptionsCopy;
              })()
            : queryOptions;

        return {
          ...optionsWithQueryKey,
          queryFn:
            optionsWithQueryKey.queryFn ??
            function ({ queryKey: [, queryParams], signal, meta }) {
              return qraftOptions
                .requestFn(schema, {
                  parameters: queryParams as never,
                  baseUrl: qraftOptions.baseUrl,
                  signal,
                  meta,
                })
                .then(requestFnResponseResolver, requestFnResponseResolver);
            },
        };
      }),
    },
    qraftOptions.queryClient
  ) as never;
};

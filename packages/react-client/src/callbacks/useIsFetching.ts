'use client';

import type { OperationSchema } from '../lib/requestFn.js';
import type { CreateAPIQueryClientOptions } from '../qraftAPIClient.js';
import type { ServiceOperationQuery } from '../service-operation/ServiceOperation.js';
import { useIsFetching as useIsFetchingTanstack } from '@tanstack/react-query';
import { composeQueryFilters } from '../lib/composeQueryFilters.js';

export const useIsFetching: <TVariables = unknown>(
  qraftOptions: CreateAPIQueryClientOptions,
  schema: OperationSchema,
  args: Parameters<
    ServiceOperationQuery<
      OperationSchema,
      object | undefined,
      TVariables,
      unknown
    >['useIsFetching']
  >
) => number = (qraftOptions, schema, args) => {
  const [filters] = args;

  return useIsFetchingTanstack(
    composeQueryFilters(schema, filters as never) as never,
    qraftOptions.queryClient
  ) as never;
};

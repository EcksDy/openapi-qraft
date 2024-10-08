'use client';

import type { DefaultError } from '@tanstack/query-core';
import type { UseMutationResult } from '@tanstack/react-query';
import type { OperationSchema } from '../lib/requestFn.js';
import type { CreateAPIQueryClientOptions } from '../qraftAPIClient.js';
import type { ServiceOperationMutation } from '../service-operation/ServiceOperation.js';
import { useIsMutating as useIsMutatingStateTanstack } from '@tanstack/react-query';
import { composeMutationFilters } from '../lib/composeMutationFilters.js';

export const useIsMutating: <
  TData = unknown,
  TError = DefaultError,
  TVariables = unknown,
  TContext = unknown,
>(
  qraftOptions: CreateAPIQueryClientOptions,
  schema: OperationSchema,
  args: Parameters<
    ServiceOperationMutation<
      OperationSchema,
      object | undefined,
      TVariables,
      TData
    >['useIsMutating']
  >
) => UseMutationResult<TData, TError, TVariables, TContext> = (
  qraftOptions,
  schema,
  args
) => {
  const [filters] = args;

  return useIsMutatingStateTanstack(
    composeMutationFilters(schema, filters) as never,
    qraftOptions.queryClient
  ) as never;
};

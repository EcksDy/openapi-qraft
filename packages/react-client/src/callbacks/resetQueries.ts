import type { OperationSchema } from '../lib/requestFn.js';
import type { QraftClientOptions } from '../qraftAPIClient.js';
import type { ServiceOperationResetQueries } from '../service-operation/ServiceOperationResetQueries.js';
import { callQueryClientMethodWithQueryFilters } from '../lib/callQueryClientMethodWithQueryFilters.js';

export function resetQueries<TData>(
  qraftOptions: QraftClientOptions,
  schema: OperationSchema,
  args: Parameters<
    ServiceOperationResetQueries<
      OperationSchema,
      unknown,
      TData
    >['resetQueries']
  >
): Promise<void> {
  return callQueryClientMethodWithQueryFilters(
    qraftOptions,
    'resetQueries',
    schema,
    args as never
  ) as never;
}

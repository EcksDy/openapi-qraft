import React, { ReactNode } from 'react';

import { type QueryClientConfig } from '@tanstack/query-core';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import { vi } from 'vitest';

import { type QraftClientOptions, requestFn } from '../index.js';
import type { OperationSchema, RequestFnInfo } from '../lib/requestFn.js';
import { createAPIClient, Services } from './fixtures/api/index.js';

const baseUrl = 'https://api.sandbox.monite.com/v1';

const requestFnWithBaseUrl = async <T,>(
  requestSchema: OperationSchema,
  requestInfo: Omit<RequestFnInfo, 'baseUrl'>
): Promise<T> =>
  requestFn(requestSchema, {
    ...requestInfo,
    baseUrl,
  });

const createClient = ({
  requestFn: requestFnProp = requestFn,
  queryClientConfig,
}: { queryClientConfig?: QueryClientConfig } & Partial<
  Pick<QraftClientOptions, 'requestFn'>
> = {}) => {
  const queryClient = new QueryClient(queryClientConfig);
  return {
    qraft: createAPIClient({
      requestFn: requestFnProp,
      queryClient,
      baseUrl,
    }),
    queryClient,
  };
};

describe('Qraft uses singular Query', () => {
  it('supports useQuery', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery({
          header: {
            'x-monite-version': '1.0.0',
          },
          path: {
            approval_policy_id: '1',
          },
          query: {
            items_order: ['asc', 'desc'],
          },
        }),
      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      expect(
        result.current.data satisfies
          | {
              header?: {
                'x-monite-version'?: string;
              };
              path?: {
                approval_policy_id?: string;
              };
              query?: {
                items_order?: ('asc' | 'desc')[];
              };
            }
          | undefined
      ).toEqual({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          approval_policy_id: '1',
        },
        query: {
          items_order: ['asc', 'desc'],
        },
      });
    });
  });

  it('supports useQuery with QueryKey', async () => {
    const { qraft, queryClient } = createClient();

    const getApprovalPoliciesIdQueryKey =
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          approval_policy_id: '1',
        },
        query: {
          items_order: ['asc', 'desc'],
        },
      });

    const { result } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery(
          getApprovalPoliciesIdQueryKey
        ),
      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(getApprovalPoliciesIdQueryKey[1]);
    });
  });

  it('supports useQuery with select()', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery(
          {
            header: {
              'x-monite-version': '1.0.0',
            },
            path: {
              approval_policy_id: '1',
            },
            query: {
              items_order: ['asc', 'desc'],
            },
          },
          {
            select(data) {
              return String(data.path?.approval_policy_id);
            },
          }
        ),
      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      expect(result.current.data satisfies string | undefined).toEqual('1');
    });
  });

  it('supports useQuery with optional params', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () => ({
        queryNoArgsWithVoidParameters: qraft.files.getFileList.useQuery(),
        queryWithEmptyParameters: qraft.files.getFileList.useQuery({}),
      }),

      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      const data = {
        data: [
          {
            file_type: 'pdf',
            id: '1',
            name: 'file1',
            url: 'http://localhost:3000/1',
          },
          {
            file_type: 'pdf',
            id: '2',
            name: 'file2',
            url: 'http://localhost:3000/2',
          },
          {
            file_type: 'pdf',
            id: '3',
            name: 'file3',
            url: 'http://localhost:3000/3',
          },
        ],
      };
      expect(result.current.queryNoArgsWithVoidParameters.data).toEqual(data);
      expect(result.current.queryWithEmptyParameters.data).toEqual(data);
    });
  });
});

describe('Qraft uses Suspense Query', () => {
  it('supports useSuspenseQuery', async () => {
    const { qraft, queryClient } = createClient();

    const hook = () => {
      try {
        return qraft.approvalPolicies.getApprovalPoliciesId.useSuspenseQuery({
          header: {
            'x-monite-version': '1.0.0',
          },
          path: {
            approval_policy_id: '1',
          },
          query: {
            items_order: ['asc', 'desc'],
          },
        });
      } catch (error) {
        return error as Promise<unknown>;
      }
    };

    const { result: resultWithErrorPromise } = renderHook(hook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    expect(resultWithErrorPromise.current).toBeInstanceOf(Promise); // Suspense throws a promise

    await resultWithErrorPromise.current;

    const { result: resultWithData } = renderHook(hook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    if (resultWithData.current instanceof Promise) {
      throw new Error('Promise should be resolved');
    }

    expect(
      resultWithData.current
        .data satisfies typeof qraft.approvalPolicies.getApprovalPoliciesId.types.data
    ).toEqual({
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    });
  });
});

describe('Qraft uses Queries', () => {
  const { qraft, queryClient } = createClient();

  const parameters: typeof qraft.approvalPolicies.getApprovalPoliciesId.types.parameters =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports useQueries with parameters and queryKey', async () => {
    const { result } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useQueries({
          queries: [
            {
              parameters,
            },
            {
              queryKey:
                qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey(
                  parameters
                ),
            },
          ],
          combine: (results) => results.map((result) => result.data),
        }),
      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      expect(result.current).toEqual([parameters, parameters]);
    });
  });

  it('supports useQueries with unified parameters', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useQueries({
          queries: [{ parameters }, { parameters }],
        }),
      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      expect(result.current[0]?.data?.path?.approval_policy_id).toEqual(
        parameters.path.approval_policy_id
      );
      expect(result.current[1]?.data?.query?.items_order).toEqual(
        parameters.query?.items_order
      );
    });
  });

  it('supports useQueries with unified parameters and combine(...)', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useQueries({
          queries: [{ parameters }, { parameters }],
          combine: (results) =>
            results.map((result) => result.data?.path?.approval_policy_id),
        }),
      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      expect(result.current satisfies Array<string | undefined>).toEqual([
        parameters.path.approval_policy_id,
        parameters.path.approval_policy_id,
      ]);
    });
  });
});

describe('Qraft uses Suspense Queries', () => {
  const { qraft, queryClient } = createClient();

  const parameters: typeof qraft.approvalPolicies.getApprovalPoliciesId.types.parameters =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports useSuspenseQueries', async () => {
    const hook = () => {
      try {
        return qraft.approvalPolicies.getApprovalPoliciesId.useSuspenseQueries({
          queries: [
            {
              parameters,
            },
            {
              queryKey:
                qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey(
                  parameters
                ),
            },
          ],
        });
      } catch (error) {
        return error as Promise<void>;
      }
    };

    const { result: resultWithErrorPromise } = renderHook(hook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    expect(resultWithErrorPromise.current).toBeInstanceOf(Promise); // Suspense throws a promise

    await resultWithErrorPromise.current;

    const { result: resultWithData } = renderHook(hook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    if (resultWithData.current instanceof Promise) {
      throw new Error('Promise should be resolved');
    }

    expect(
      resultWithData.current[0]
        .data satisfies typeof qraft.approvalPolicies.getApprovalPoliciesId.types.data
    ).toEqual(parameters);
    expect(
      resultWithData.current[1]
        .data satisfies typeof qraft.approvalPolicies.getApprovalPoliciesId.types.data
    ).toEqual(parameters);
  });

  it('supports useSuspenseQueries with combine()', async () => {
    const hook = () => {
      try {
        return qraft.approvalPolicies.getApprovalPoliciesId.useSuspenseQueries({
          queries: [
            {
              parameters,
            },
            {
              queryKey:
                qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey(
                  parameters
                ),
            },
          ],
          combine: (results) =>
            results.map((result) => result.data?.query?.items_order),
        });
      } catch (error) {
        return error as Promise<void>;
      }
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    });

    const { result: resultWithErrorPromise } = renderHook(hook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    expect(resultWithErrorPromise.current).toBeInstanceOf(Promise); // Suspense throws a promise

    await waitFor(async () => {
      expect(
        (await resultWithErrorPromise.current) satisfies
          | void
          | (('asc' | 'desc')[] | undefined)[]
      ).toEqual([
        ['asc', 'desc'],
        ['asc', 'desc'],
      ]);
    });
  });
});

describe('Qraft uses Infinite Queries', () => {
  const parameters: Services['files']['getFiles']['types']['parameters'] = {
    header: {
      'x-monite-version': '1.0.0',
    },
    query: {
      id__in: ['1', '2'],
    },
  };

  it('supports useInfiniteQuery with parameters', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () =>
        qraft.files.getFiles.useInfiniteQuery(parameters, {
          getNextPageParam: (lastPage, allPages, params) => {
            return {
              query: {
                page: params.query?.page
                  ? String(Number(params.query.page) + 1)
                  : undefined,
              },
            };
          },
          initialPageParam: {
            query: {
              page: '1',
            },
          },
        }),
      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({
        pageParams: [
          {
            query: {
              page: '1',
            },
          },
        ],
        pages: [
          {
            header: {
              'x-monite-version': '1.0.0',
            },
            query: {
              id__in: ['1', '2'],
              page: '1',
            },
          },
        ],
      });
    });
  });

  it('supports useInfiniteQuery with select', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () =>
        qraft.files.getFiles.useInfiniteQuery(
          {
            header: {
              'x-monite-version': '1.0.0',
            },
            query: {
              id__in: ['1', '2'],
            },
          },
          {
            getNextPageParam: (lastPage, allPages, params) => {
              return {
                query: {
                  page: params.query?.page
                    ? String(Number(params.query.page) + 1)
                    : undefined,
                },
              };
            },
            initialPageParam: {
              query: {
                page: '1',
              },
            },
            select: (data) => ({
              pages: data.pages.map((page) => page.query?.id__in),
              pageParams: data.pageParams,
            }),
          }
        ),
      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      result.current.data?.pages.map((page) => page);
      result.current.data?.pageParams.map((pageParam) => pageParam);

      expect(
        result.current.data satisfies
          | {
              pages: Array<string[] | undefined>;
              pageParams: {
                query?: {
                  page?: string;
                };
              }[];
            }
          | undefined
      ).toEqual({
        pages: [['1', '2']],
        pageParams: [
          {
            query: {
              page: '1',
            },
          },
        ],
      });
    });
  });

  it('supports useInfiniteQuery with queryKey', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () =>
        qraft.files.getFiles.useInfiniteQuery(
          qraft.files.getFiles.getInfiniteQueryKey(parameters),
          {
            getNextPageParam: (lastPage, allPages, params) => {
              return {
                query: {
                  page: params.query?.page
                    ? String(Number(params.query.page) + 1)
                    : undefined,
                },
              };
            },
            initialPageParam: {
              query: {
                page: '1',
              },
            },
          }
        ),
      {
        wrapper: (props) => <Providers queryClient={queryClient} {...props} />,
      }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({
        pageParams: [
          {
            query: {
              page: '1',
            },
          },
        ],
        pages: [
          {
            header: {
              'x-monite-version': '1.0.0',
            },
            query: {
              id__in: ['1', '2'],
              page: '1',
            },
          },
        ],
      });
    });
  });

  it('supports useInfiniteQuery with next page', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () =>
        qraft.files.getFiles.useInfiniteQuery(
          {
            header: {
              'x-monite-version': '1.0.0',
            },
            query: {
              id__in: ['1', '2'],
            },
          },
          {
            getNextPageParam: (lastPage, allPages, params) => {
              return {
                query: {
                  page: params.query?.page
                    ? String(Number(params.query.page) + 1)
                    : undefined,
                },
              };
            },
            initialPageParam: {
              query: {
                page: '1',
              },
            },
          }
        ),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBeTruthy();
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    const { result: result2 } = renderHook(
      () => {
        const queryClient = useQueryClient();

        return queryClient.getQueryData(
          qraft.files.getFiles.getInfiniteQueryKey({
            header: {
              'x-monite-version': '1.0.0',
            },
            query: {
              id__in: ['1', '2'],
            },
          })
        );
      },
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    await waitFor(() => {
      expect(result2.current).toEqual({
        pageParams: [
          {
            query: {
              page: '1',
            },
          },
          {
            query: {
              page: '2',
            },
          },
        ],
        pages: [
          {
            header: {
              'x-monite-version': '1.0.0',
            },
            query: {
              id__in: ['1', '2'],
              page: '1',
            },
          },
          {
            header: {
              'x-monite-version': '1.0.0',
            },
            query: {
              id__in: ['1', '2'],
              page: '2',
            },
          },
        ],
      });
    });
  });
});

describe('Qraft uses Suspense Infinite Queries', () => {
  it('supports useSuspenseInfiniteQuery', async () => {
    const { qraft, queryClient } = createClient();

    const hook = () => {
      try {
        return qraft.files.getFiles.useSuspenseInfiniteQuery(
          {
            header: {
              'x-monite-version': '1.0.0',
            },
            query: {
              id__in: ['1', '2'],
            },
          },
          {
            getNextPageParam: (lastPage, allPages, params) => {
              return {
                query: {
                  page: params.query?.page
                    ? String(Number(params.query.page) + 1)
                    : undefined,
                },
              };
            },
            initialPageParam: {
              query: {
                page: '1',
              },
            },
          }
        );
      } catch (error) {
        return error as Promise<unknown>;
      }
    };

    const { result: resultWithErrorPromise } = renderHook(hook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    expect(resultWithErrorPromise.current).toBeInstanceOf(Promise); // Suspense throws a promise

    await resultWithErrorPromise.current;

    const { result: resultWithData } = renderHook(hook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    if (resultWithData.current instanceof Promise) {
      throw new Error('Promise should be resolved');
    }

    expect(resultWithData.current.data).toEqual({
      pageParams: [
        {
          query: {
            page: '1',
          },
        },
      ],
      pages: [
        {
          header: {
            'x-monite-version': '1.0.0',
          },
          query: {
            id__in: ['1', '2'],
            page: '1',
          },
        },
      ],
    });
  });
});

describe('Qraft uses predefined parameters (--operation-predefined-parameters)', () => {
  it('supports useMutation without predefined parameters', async () => {
    const { qraft, queryClient } = createClient({
      requestFn(schema, requestInfo) {
        if (schema.url === qraft.entities.postEntitiesIdDocuments.schema.url)
          return requestFnWithBaseUrl(schema, {
            ...requestInfo,
            headers: {
              'x-monite-version': '3.3.3',
            },
          });
        return requestFnWithBaseUrl(schema, requestInfo);
      },
    });

    const { result } = renderHook(
      () => qraft.entities.postEntitiesIdDocuments.useMutation(),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      result.current.mutate({
        /**
         * Should be passed, normally ⬇︎
         * header: {
         *   'x-monite-version': '1.0.0',
         * }
         */
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        header: {
          'x-monite-version': '3.3.3',
        },
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      });
    });
  });
});

describe('Qraft uses Mutations', () => {
  it('supports useMutation without predefined parameters', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () => qraft.entities.postEntitiesIdDocuments.useMutation(),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      result.current.mutate({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      });
    });
  });

  it('emits an error if useMutation() mutate() requires variables', async () => {
    expect(() =>
      // @ts-expect-error - useMutation() requires variables
      qraft.entities.postEntitiesIdDocuments.useMutation().mutate()
    ).toThrow(Error);
  });

  it('handles useMutation.mutate without body or parameters when optional or undefined', async () => {
    const { result } = renderHook(
      () => ({
        mutateNoArgsWithVoidParameters: qraft.files.deleteFiles.useMutation(),
        mutateNoArgsWithEmptyParameters: qraft.files.deleteFiles.useMutation(
          {}
        ),
        mutateWithPredefinedParameters: qraft.files.deleteFiles.useMutation({
          query: { all: true },
        }),
        mutateWithParameters: qraft.files.deleteFiles.useMutation(),
        mutateWithEmptyBody: qraft.files.deleteFiles.useMutation(),
      }),
      {
        wrapper: Providers,
      }
    );

    act(() => {
      const {
        mutateNoArgsWithVoidParameters,
        mutateNoArgsWithEmptyParameters,
        mutateWithPredefinedParameters,
        mutateWithParameters,
        mutateWithEmptyBody,
      } = result.current;

      mutateNoArgsWithVoidParameters.mutate();
      mutateNoArgsWithEmptyParameters.mutate();
      mutateWithPredefinedParameters.mutate();
      mutateWithParameters.mutate({ query: { all: true } });
      mutateWithEmptyBody.mutate({ body: undefined });
    });

    await waitFor(() => {
      const {
        mutateNoArgsWithVoidParameters,
        mutateNoArgsWithEmptyParameters,
        mutateWithPredefinedParameters,
        mutateWithParameters,
        mutateWithEmptyBody,
      } = result.current;

      expect(mutateNoArgsWithVoidParameters.data).toBeUndefined();
      expect(mutateNoArgsWithEmptyParameters.data).toEqual({
        query: {},
      });
      expect(mutateWithPredefinedParameters.data).toEqual({
        query: { all: 'true' },
      });
      expect(mutateWithParameters.data).toEqual({
        query: { all: 'true' },
      });
      expect(mutateWithEmptyBody.data).toEqual({ query: {} });
    });
  });

  it('supports useMutation with predefined parameters', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () =>
        qraft.entities.postEntitiesIdDocuments.useMutation({
          header: {
            'x-monite-version': '1.0.0',
          },
          path: {
            entity_id: '1',
          },
          query: {
            referer: 'https://example.com',
          },
        }),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      result.current.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      });
    });
  });

  it('supports useMutation with form data', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(() => qraft.files.postFiles.useMutation(), {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate({
        body: {
          file: new File([''], 'file.png'),
          file_description: 'my file',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        body: {
          file: 'file.png',
          file_description: 'my file',
        },
      });
    });
  });
});

describe('Qraft uses useIsMutating', () => {
  const parameters: Services['entities']['postEntitiesIdDocuments']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        entity_id: '1',
      },
      query: {
        referer: 'https://example.com',
      },
    };

  it('supports useIsMutating with filters', async () => {
    const { qraft, queryClient } = createClient();
    const { result: mutationResult } = renderHook(
      () => qraft.entities.postEntitiesIdDocuments.useMutation(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      mutationResult.current.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    const { result: isMutatingResult } = renderHook(
      () =>
        qraft.entities.postEntitiesIdDocuments.useIsMutating({ parameters }),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    await waitFor(() => {
      expect(isMutatingResult.current).toEqual(1);
    });
  });

  it('supports useIsMutating without filters', async () => {
    const { qraft, queryClient } = createClient();
    const { result: mutationResult } = renderHook(
      () => {
        return {
          mutation_01:
            qraft.entities.postEntitiesIdDocuments.useMutation(parameters),
          mutation_02: qraft.entities.postEntitiesIdDocuments.useMutation({
            ...parameters,
            header: {
              'x-monite-version': '2.2.2',
            },
          }),
        };
      },
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      mutationResult.current.mutation_01.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
      mutationResult.current.mutation_02.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    const { result: isMutatingResult } = renderHook(
      () => {
        return {
          noParams: qraft.entities.postEntitiesIdDocuments.useIsMutating(),
          withParams: qraft.entities.postEntitiesIdDocuments.useIsMutating({
            parameters,
          }),
        };
      },
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(isMutatingResult.current.withParams).toEqual(1);
    expect(isMutatingResult.current.noParams).toEqual(2);
  });
});

describe('Qraft uses Mutation State', () => {
  const parameters = {
    header: {
      'x-monite-version': '1.0.0',
    },
    path: {
      entity_id: '1',
    },
    query: {
      referer: 'https://example.com',
    },
  } as const;

  it('supports useMutationState with filter', async () => {
    const { qraft, queryClient } = createClient();

    const { result: mutationResult } = renderHook(
      () => qraft.entities.postEntitiesIdDocuments.useMutation(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      mutationResult.current.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    await waitFor(() => {
      expect(mutationResult.current.data).toBeDefined();
    });

    const { result: mutationStateResult } = renderHook(
      () =>
        qraft.entities.postEntitiesIdDocuments.useMutationState({
          filters: {
            parameters,
          },
        }),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(mutationStateResult.current.at(0)?.data).toEqual({
      body: {
        verification_document_back: 'back',
        verification_document_front: 'front',
      },
      ...parameters,
    });
  });

  it('supports useMutationState with filter and select', async () => {
    const { qraft, queryClient } = createClient();

    const { result: mutationResult } = renderHook(
      () => qraft.entities.postEntitiesIdDocuments.useMutation(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      mutationResult.current.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    await waitFor(() => {
      expect(mutationResult.current.data).toBeDefined();
    });

    const { result: mutationStateResult } = renderHook(
      () =>
        qraft.entities.postEntitiesIdDocuments.useMutationState({
          filters: {
            parameters,
          },
          select(mutation) {
            return (
              mutation.state.data?.header?.['x-monite-version'] ===
              parameters.header['x-monite-version']
            );
          },
        }),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(mutationStateResult.current.at(0)).toEqual(true);
  });

  it('supports useMutationState with without filter', async () => {
    const { qraft, queryClient } = createClient();

    const { result: mutationResult } = renderHook(
      () => qraft.entities.postEntitiesIdDocuments.useMutation(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      mutationResult.current.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    await waitFor(() => {
      expect(mutationResult.current.data).toBeDefined();
    });

    const { result: mutationStateResult } = renderHook(
      () => qraft.entities.postEntitiesIdDocuments.useMutationState(),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(mutationStateResult.current.at(0)?.data).toEqual({
      body: {
        verification_document_back: 'back',
        verification_document_front: 'front',
      },
      ...parameters,
    });
  });

  it('supports useMutationState with mutationKey and select', async () => {
    const { qraft, queryClient } = createClient();

    const { result: mutationHookResultToMatch } = renderHook(
      () => qraft.entities.postEntitiesIdDocuments.useMutation(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      mutationHookResultToMatch.current.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    await waitFor(() => {
      expect(mutationHookResultToMatch.current.data).toBeDefined();
    });

    const { result: mutationStateHookResult } = renderHook(
      () =>
        qraft.entities.postEntitiesIdDocuments.useMutationState({
          filters: {
            mutationKey:
              qraft.entities.postEntitiesIdDocuments.getMutationKey(parameters),
          },
          select(mutation) {
            return (
              mutation.state.data?.header?.['x-monite-version'] ===
              parameters.header['x-monite-version']
            );
          },
        }),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(mutationStateHookResult.current.length).toEqual(1);
    expect(mutationStateHookResult.current.at(0)).toEqual(true);
  });

  it('supports useMutationState with not partial parameters', async () => {
    const { qraft, queryClient } = createClient();

    const { result: mutationHookResultToMatch } = renderHook(
      () => qraft.entities.postEntitiesIdDocuments.useMutation(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      mutationHookResultToMatch.current.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    await waitFor(() => {
      expect(mutationHookResultToMatch.current.data).toBeDefined();
    });

    const { result: mutationStateResult } = renderHook(
      () =>
        qraft.entities.postEntitiesIdDocuments.useMutationState({
          filters: {
            parameters: {
              header: parameters.header,
            },
          },
          select(mutation) {
            return (
              mutation.state.data?.header?.['x-monite-version'] ===
              parameters.header['x-monite-version']
            );
          },
        }),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(mutationStateResult.current.length).toEqual(1);
    expect(mutationStateResult.current.at(0)).toEqual(true);
  });
});

describe('Qraft uses Query Function', () => {
  const parameters: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  /**
   * @deprecated
   */
  it('uses queryFn with `parameters`', async () => {
    const { qraft } = createClient();

    const result = await qraft.approvalPolicies.getApprovalPoliciesId.queryFn(
      { parameters },
      requestFnWithBaseUrl
    );

    expect(result).toEqual({
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    });
  });

  it('uses Operation Query with `parameters` and without `baseUrl`', async () => {
    const { qraft } = createClient();

    const result = await qraft.approvalPolicies.getApprovalPoliciesId(
      { parameters },
      requestFnWithBaseUrl
    );

    expect(result).toEqual({
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    });
  });

  it('uses Operation Query with `baseUrl`', async () => {
    const { qraft } = createClient();

    const result = await qraft.approvalPolicies.getApprovalPoliciesId(
      { parameters, baseUrl },
      requestFn
    );

    expect(result).toEqual({
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    });
  });

  it('uses Operation Query with `queryKey`', async () => {
    const { qraft } = createClient();

    const result = await qraft.approvalPolicies.getApprovalPoliciesId(
      {
        queryKey: [
          {
            url: '/approval_policies/{approval_policy_id}',
            method: 'get',
            security: ['partnerToken'],
            infinite: false,
          },
          parameters,
        ],
      },
      requestFnWithBaseUrl
    );

    expect(result).toEqual(parameters);
  });

  it('uses fetchQuery with `parameters`', async () => {
    const { qraft, queryClient } = createClient();

    const result = qraft.approvalPolicies.getApprovalPoliciesId.fetchQuery(
      {
        requestFn: requestFn,
        baseUrl: 'https://api.sandbox.monite.com/v1',
        parameters,
      },
      queryClient
    );

    await expect(result).resolves.toEqual(parameters);
  });

  it('uses fetchQuery with `queryKey`', async () => {
    const { qraft, queryClient } = createClient();

    const result = qraft.approvalPolicies.getApprovalPoliciesId.fetchQuery(
      {
        requestFn: requestFn,
        baseUrl: 'https://api.sandbox.monite.com/v1',
        queryKey:
          qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey(parameters),
      },
      queryClient
    );

    await expect(result).resolves.toEqual(parameters);
  });

  it('uses fetchQuery with queryFn', async () => {
    const { qraft, queryClient } = createClient();

    const customResult: typeof qraft.approvalPolicies.getApprovalPoliciesId.types.parameters =
      {
        ...parameters,
        header: { 'x-monite-version': '2.0.0' },
      };

    const result = qraft.approvalPolicies.getApprovalPoliciesId.fetchQuery(
      {
        queryFn: () => Promise.resolve(customResult),
        queryKey:
          qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey(parameters),
      },
      queryClient
    );

    await expect(result).resolves.toEqual(customResult);
  });

  it('uses fetchQuery with default requestFn set by specific "QueryKey"', async () => {
    const { qraft, queryClient } = createClient();

    queryClient.setQueryDefaults(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey(parameters),
      { queryFn: () => Promise.resolve(parameters) }
    );

    const result = qraft.approvalPolicies.getApprovalPoliciesId.fetchQuery(
      { parameters },
      queryClient
    );

    await expect(result).resolves.toEqual(parameters);
  });

  it('uses fetchQuery with default requestFn set by base "QueryKey"', async () => {
    const { qraft, queryClient } = createClient();

    queryClient.setQueryDefaults(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey(),
      { queryFn: () => Promise.resolve(parameters) }
    );

    const result = qraft.approvalPolicies.getApprovalPoliciesId.fetchQuery(
      { parameters },
      queryClient
    );

    await expect(result).resolves.toEqual(parameters);
  });

  it('uses prefetchQuery with `parameters`', async () => {
    const { qraft, queryClient } = createClient();

    const result = qraft.approvalPolicies.getApprovalPoliciesId.prefetchQuery(
      {
        requestFn: requestFn,
        baseUrl: 'https://api.sandbox.monite.com/v1',
        parameters,
      },
      queryClient
    );

    // Prefetching doesn't return the data
    await expect(result).resolves.toEqual(undefined);

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters)
    ).toEqual(parameters);
  });

  it('uses fetchInfiniteQuery with multiple pages', async () => {
    const { qraft, queryClient } = createClient();

    const result =
      qraft.approvalPolicies.getApprovalPoliciesId.fetchInfiniteQuery(
        {
          requestFn: requestFn,
          baseUrl: 'https://api.sandbox.monite.com/v1',
          parameters,
          initialPageParam: {
            query: {
              items_order: ['asc', 'asc', 'asc'],
            },
          },
          pages: 2,
          getNextPageParam: (lastPage, allPages, params) => {
            return {
              query: {
                items_order: [...(params.query?.items_order || []), 'desc'],
              },
            };
          },
        },
        queryClient
      );

    await expect(result).resolves.toEqual({
      pageParams: [
        {
          query: {
            items_order: ['asc', 'asc', 'asc'],
          },
        },
        {
          query: {
            items_order: ['asc', 'asc', 'asc', 'desc'],
          },
        },
      ],
      pages: [
        {
          ...parameters,
          query: {
            ...parameters.query,
            items_order: ['asc', 'asc', 'asc'],
          },
        },
        {
          ...parameters,
          query: {
            ...parameters.query,
            items_order: ['asc', 'asc', 'asc', 'desc'],
          },
        },
      ],
    });
  });

  it('uses prefetchInfiniteQuery', async () => {
    const { qraft, queryClient } = createClient();

    const result =
      qraft.approvalPolicies.getApprovalPoliciesId.prefetchInfiniteQuery(
        {
          requestFn: requestFn,
          baseUrl: 'https://api.sandbox.monite.com/v1',
          parameters,
          initialPageParam: {
            query: {
              items_order: ['asc', 'asc', 'asc'],
            },
          },
        },
        queryClient
      );

    await expect(result).resolves.toBeUndefined();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getInfiniteQueryData(
        parameters
      )
    ).toEqual({
      pageParams: [
        {
          query: {
            items_order: ['asc', 'asc', 'asc'],
          },
        },
      ],
      pages: [
        {
          ...parameters,
          query: {
            ...parameters.query,
            items_order: ['asc', 'asc', 'asc'],
          },
        },
      ],
    });
  });
});

describe('Qraft uses mutationFn', () => {
  /**
   * @deprecated
   */
  it('supports mutationFn', async () => {
    const { qraft } = createClient();

    const result = await qraft.entities.postEntitiesIdDocuments.mutationFn(
      requestFnWithBaseUrl,
      {
        parameters: {
          header: {
            'x-monite-version': '1.0.0',
          },
          path: {
            entity_id: '1',
          },
          query: {
            referer: 'https://example.com',
          },
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      }
    );

    await waitFor(() => {
      expect(result).toEqual({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      });
    });
  });

  it('supports Operation Mutation without `baseUrl`', async () => {
    const { qraft } = createClient();

    const result = await qraft.entities.postEntitiesIdDocuments(
      {
        parameters: {
          header: {
            'x-monite-version': '1.0.0',
          },
          path: {
            entity_id: '1',
          },
          query: {
            referer: 'https://example.com',
          },
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      },
      requestFnWithBaseUrl
    );

    await waitFor(() => {
      expect(result).toEqual({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      });
    });
  });

  it('supports Operation Mutation with `baseUrl`', async () => {
    const { qraft } = createClient();

    const result = await qraft.entities.postEntitiesIdDocuments(
      {
        baseUrl,
        parameters: {
          header: {
            'x-monite-version': '1.0.0',
          },
          path: {
            entity_id: '1',
          },
          query: {
            referer: 'https://example.com',
          },
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      },
      requestFn
    );

    await waitFor(() => {
      expect(result).toEqual({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      });
    });
  });
});

describe('Proxy call manipulations', () => {
  const { qraft } = createClient();

  it('reads the schema', () => {
    expect(qraft.files.getFiles.schema).toEqual({
      url: '/files',
      security: ['HTTPBearer'],
      method: 'get',
    });
  });

  const parameters: typeof qraft.files.getFiles.types.parameters = {
    header: { 'x-monite-version': '1.0.0' },
    query: { id__in: ['1', '2'] },
  };

  it('uses "apply" on proxy', async () => {
    expect(qraft.files.getFiles.getQueryKey.apply(null, [parameters])).toEqual([
      { ...qraft.files.getFiles.schema, infinite: false },
      parameters,
    ]);
  });

  it('uses "call" on proxy', async () => {
    expect(qraft.files.getFiles.getQueryKey.call(null, parameters)).toEqual([
      { ...qraft.files.getFiles.schema, infinite: false },
      parameters,
    ]);
  });
});

describe('Qraft uses utils', () => {
  const { qraft } = createClient();

  it('throws an error when calling an unsupported service ', () => {
    expect(() =>
      // @ts-expect-error - Invalid usage
      qraft.counterparts.postCounterpartsIdAddresses.useQuery({})
    ).toThrowError(/Service operation not found/i);
  });

  it('throws an error when calling an unsupported method ', () => {
    expect(() =>
      // @ts-expect-error - Invalid usage of method
      qraft.files.getFileList.unsupportedMethod()
    ).toThrowError(/Function unsupportedMethod is not supported/i);
  });

  it('resolves original proxy in promises ', async () => {
    const getFilesProxy = qraft.files.getFiles;
    expect(getFilesProxy === (await Promise.resolve(getFilesProxy))).toEqual(
      true
    );
  });
});

describe('Qraft uses setQueryData', () => {
  it('uses setQueryData & getQueryData', async () => {
    const { qraft, queryClient } = createClient();

    qraft.files.getFiles.setQueryData(
      {
        header: {
          'x-monite-version': '1.0.0',
        },
        query: {
          id__in: ['1', '2'],
        },
      },
      {
        header: {
          'x-monite-version': '1.0.0',
        },
        query: {
          id__in: ['1', '2'],
        },
      }
    );

    expect(
      qraft.files.getFiles.getQueryData({
        header: {
          'x-monite-version': '1.0.0',
        },
        query: {
          id__in: ['1', '2'],
        },
      })
    ).toEqual({
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    });
  });

  it('uses setQueryData & getQueryData with QueryKey', async () => {
    const { qraft, queryClient } = createClient();

    const getFilesQueryKey = qraft.files.getFiles.getQueryKey({
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    });

    const getFilesSetQueryData: typeof qraft.files.getFiles.types.data = {
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    };

    qraft.files.getFiles.setQueryData(getFilesQueryKey, getFilesSetQueryData, {
      updatedAt: Date.now(),
    });

    expect(qraft.files.getFiles.getQueryData(getFilesQueryKey)).toEqual(
      getFilesSetQueryData
    );

    expect(qraft.files.getFiles.getQueryData(getFilesQueryKey[1])).toEqual(
      getFilesSetQueryData
    );
  });

  it('does not return getQueryData() from Infinite query', async () => {
    const { qraft, queryClient } = createClient();

    const parameters = {
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    };

    qraft.files.getFiles.setInfiniteQueryData(parameters, {
      pages: [parameters],
      pageParams: [parameters],
    });

    expect(qraft.files.getFiles.getQueryData(parameters)).not.toBeDefined();
  });
});

describe('Qraft uses setQueriesData', () => {
  it('uses setQueriesData with parameters', async () => {
    const { qraft, queryClient } = createClient();

    const parameters: typeof qraft.files.getFiles.types.parameters = {
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    };

    qraft.files.getFiles.setQueryData(parameters, parameters);

    qraft.files.getFiles.setQueriesData(
      { parameters, infinite: false },
      { ...parameters, header: { 'x-monite-version': '2.0.0' } }
    );

    expect(qraft.files.getFiles.getQueryData(parameters)).toEqual({
      ...parameters,
      header: { 'x-monite-version': '2.0.0' },
    });
  });
});

describe('Qraft uses getQueriesData', () => {
  const parameters: Services['files']['getFiles']['types']['parameters'] = {
    header: {
      'x-monite-version': '1.0.0',
    },
    query: {
      id__in: ['1', '2'],
    },
  };

  it('uses getQueriesData with parameters', async () => {
    const { qraft, queryClient } = createClient();

    qraft.files.getFiles.setQueryData(parameters, parameters);

    expect(
      qraft.files.getFiles.getQueriesData({ parameters, infinite: false })
    ).toEqual([[qraft.files.getFiles.getQueryKey(parameters), parameters]]);
  });

  it('uses getQueriesData Infinite Queries', async () => {
    const { qraft, queryClient } = createClient();

    qraft.files.getFiles.setInfiniteQueryData(parameters, {
      pages: [parameters],
      pageParams: [parameters],
    });

    const queries = qraft.files.getFiles.getQueriesData({
      parameters,
      infinite: true,
    });

    const [query] = queries;

    expect(query).toBeDefined();

    expect(
      // TS Type quick test
      query?.[1]?.pages?.[0]?.header?.['x-monite-version'] ===
        parameters.header['x-monite-version']
    ).toBeTruthy();

    expect(
      // TS Type quick test
      query?.[1]?.pages?.[0]
    ).toEqual(parameters);
  });
});

describe('Qraft uses setInfiniteQueryData', () => {
  it('uses setInfiniteQueryData & getInfiniteQueryData with parameters', async () => {
    const { qraft, queryClient } = createClient();

    const parameters: typeof qraft.files.getFiles.types.parameters = {
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    };

    qraft.files.getFiles.setInfiniteQueryData(parameters, {
      pages: [parameters],
      pageParams: [parameters],
    });

    const expectedResult = {
      pages: [parameters],
      pageParams: [parameters],
    };

    expect(qraft.files.getFiles.getInfiniteQueryData(parameters)).toEqual(
      expectedResult
    );

    expect(
      qraft.files.getFiles.getInfiniteQueryData(
        qraft.files.getFiles.getInfiniteQueryKey(parameters)
      )
    ).toEqual(expectedResult);
  });

  it('uses setInfiniteQueryData & getInfiniteQueryData with queryKey', async () => {
    const { qraft, queryClient } = createClient();

    const parameters: typeof qraft.files.getFiles.types.parameters = {
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    };

    qraft.files.getFiles.setInfiniteQueryData(
      qraft.files.getFiles.getInfiniteQueryKey(parameters),
      {
        pages: [parameters],
        pageParams: [parameters],
      }
    );

    const expectedResult = {
      pages: [parameters],
      pageParams: [parameters],
    };

    expect(qraft.files.getFiles.getInfiniteQueryData(parameters)).toEqual(
      expectedResult
    );

    expect(
      qraft.files.getFiles.getInfiniteQueryData(
        qraft.files.getFiles.getInfiniteQueryKey(parameters)
      )
    ).toEqual(expectedResult);
  });

  it('does not return getInfiniteQueryData() from non Infinite query', async () => {
    const { qraft, queryClient } = createClient();

    const parameters: typeof qraft.files.getFiles.types.parameters = {
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    };

    qraft.files.getFiles.setQueryData(parameters, {
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    });

    expect(
      qraft.files.getFiles.getInfiniteQueryData(parameters)
    ).not.toBeDefined();
  });
});

describe('Qraft uses Queries Invalidation', () => {
  const parameters: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports invalidateQueries by parameters', async () => {
    const { qraft, queryClient } = createClient({
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnMount: false,
          },
        },
      },
    });

    const { result: result_01 } = renderHook(
      () => qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
      expect(result_01.current.isFetching).toBeFalsy();
    });

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
        parameters,
        infinite: false,
      })
    ).toBeInstanceOf(Promise);

    const { result: result_02 } = renderHook(
      () => qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(result_02.current.isFetching).toBeTruthy();
  });

  it('supports invalidateQueries by queryKey', async () => {
    const { qraft, queryClient } = createClient({
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnMount: false,
          },
        },
      },
    });

    const { result: result_01 } = renderHook(
      () => qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
      expect(result_01.current.isFetching).toBeFalsy();
    });

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
        queryKey:
          qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey(parameters),
      })
    ).toBeInstanceOf(Promise);

    const { result: result_02 } = renderHook(
      () => qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(result_02.current.isFetching).toBeTruthy();
  });

  describe('Qraft uses getQueryState', () => {
    it('supports getQueryState by parameters', async () => {
      const { qraft, queryClient } = createClient({
        queryClientConfig: {
          defaultOptions: {
            queries: {
              refetchOnMount: false,
            },
          },
        },
      });

      renderHook(
        () => qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
        {
          wrapper: (props) => (
            <Providers {...props} queryClient={queryClient} />
          ),
        }
      );

      await waitFor(() => {
        expect(
          qraft.approvalPolicies.getApprovalPoliciesId.getQueryState(parameters)
            ?.status
        ).toEqual('success');
      });
    });

    it('supports getQueryState by parameters and infinite query', async () => {
      const { qraft, queryClient } = createClient({
        queryClientConfig: {
          defaultOptions: {
            queries: {
              refetchOnMount: false,
            },
          },
        },
      });

      renderHook(
        () =>
          qraft.approvalPolicies.getApprovalPoliciesId.useInfiniteQuery(
            parameters,
            {
              initialPageParam: {},
              getNextPageParam: () => {
                return {};
              },
            }
          ),
        {
          wrapper: (props) => (
            <Providers {...props} queryClient={queryClient} />
          ),
        }
      );

      await waitFor(() => {
        expect(
          qraft.approvalPolicies.getApprovalPoliciesId.getInfiniteQueryState(
            parameters
          )?.status
        ).toEqual('success');
      });
    });
  });

  it('supports invalidateQueries with options', async () => {
    const { qraft, queryClient } = createClient({
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnMount: false,
          },
        },
      },
    });

    let counter = 0;

    const useMockHook = () => {
      return qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters, {
        retry: false,
        queryFn: () => {
          if (++counter > 1) throw new Error('Invalidation Error');
          return Promise.resolve(parameters);
        },
      });
    };

    const { result: result_01 } = renderHook(useMockHook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
      expect(result_01.current.isFetching).toBeFalsy();
    });

    await expect(
      qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries(
        { parameters, infinite: false },
        { throwOnError: true }
      )
    ).rejects.toThrowError('Invalidation Error');
  });

  it('requires invalidateQueries queryClient instance', async () => {
    expect(() =>
      // @ts-expect-error - Invalid usage
      qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries()
    ).toThrowError();
  });

  it('supports invalidateQueries without filters and not effect other queries', async () => {
    const { qraft, queryClient } = createClient({
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnMount: false,
          },
        },
      },
    });

    const useQueryHooks = () => ({
      getApprovalPoliciesIdQuery:
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
      getApprovalPoliciesIdInfiniteQuery:
        qraft.approvalPolicies.getApprovalPoliciesId.useInfiniteQuery(
          parameters,
          {
            initialPageParam: {},
            getNextPageParam: () => {
              return {};
            },
          }
        ),
      getFileListQuery: qraft.files.getFileList.useQuery({}),
    });

    const { result: hookResult_01 } = renderHook(useQueryHooks, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    await waitFor(() => {
      expect(
        hookResult_01.current.getApprovalPoliciesIdQuery.isSuccess
      ).toBeTruthy();
      expect(
        hookResult_01.current.getApprovalPoliciesIdInfiniteQuery.isSuccess
      ).toBeTruthy();
      expect(hookResult_01.current.getFileListQuery.isSuccess).toBeTruthy();
    });

    act(() => {
      expect(
        qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries()
      ).toBeInstanceOf(Promise);
    });

    const { result: hookResult_02 } = renderHook(useQueryHooks, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    expect(
      hookResult_02.current.getApprovalPoliciesIdQuery.isFetching
    ).toBeTruthy();
    expect(
      hookResult_02.current.getApprovalPoliciesIdInfiniteQuery.isFetching
    ).toBeTruthy();
    expect(hookResult_02.current.getFileListQuery.isFetching).toBeFalsy();
  });

  it('supports invalidateQueries for Infinite Query', async () => {
    const { qraft, queryClient } = createClient({
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnMount: false,
          },
        },
      },
    });

    const useInfiniteQueryHook = () =>
      qraft.approvalPolicies.getApprovalPoliciesId.useInfiniteQuery(
        parameters,
        {
          initialPageParam: {},
          getNextPageParam: () => {
            return {};
          },
        }
      );

    const { result: result_01 } = renderHook(useInfiniteQueryHook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
      expect(result_01.current.isFetching).toBeFalsy();
    });

    const counterFn = vi.fn<[{ infinite: boolean | undefined }]>();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
        parameters,
        infinite: true,
        predicate: (query) => {
          counterFn({
            infinite:
              'infinite' in query.queryKey[0]
                ? query.queryKey[0].infinite
                : false,
          });
          return true;
        },
      })
    ).toBeInstanceOf(Promise);

    const { result: result_02 } = renderHook(useInfiniteQueryHook, {
      wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
    });

    expect(result_02.current.isFetching).toBeTruthy();

    expect(counterFn.mock.calls).toEqual(
      new Array(counterFn.mock.calls.length).fill([{ infinite: true }])
    );
  });

  it('does not invalidateQueries by not matching queryKey', async () => {
    const { qraft, queryClient } = createClient({
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnMount: false,
          },
        },
      },
    });

    const { result: result_01 } = renderHook(
      () => qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
      expect(result_01.current.isFetching).toBeFalsy();
    });

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
        queryKey: qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey({
          ...parameters,
          path: {
            approval_policy_id: `NOT-MATCHING-${parameters.path.approval_policy_id}`,
          },
        }),
      })
    ).toBeInstanceOf(Promise);

    const { result: result_02 } = renderHook(
      () => qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(result_02.current.isFetching).toBeFalsy();
  });

  it('supports invalidateQueries with predicate', async () => {
    const { qraft, queryClient } = createClient({
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnMount: false,
          },
        },
      },
    });

    const filesQueryKey = qraft.files.getFiles.getQueryKey({
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    });

    // Mix with another query to make sure it's not in predicate
    await queryClient.fetchQuery({
      queryKey: filesQueryKey,
      queryFn: () =>
        qraft.files.getFiles({ queryKey: filesQueryKey, baseUrl }, requestFn),
    });

    const { result: result_01 } = renderHook(
      () => qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
      expect(result_01.current.isFetching).toBeFalsy();
    });

    const counterFn =
      vi.fn<
        [typeof qraft.approvalPolicies.getApprovalPoliciesId.types.parameters]
      >();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
        queryKey: qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey({
          header: parameters.header,
          path: parameters.path,
        }),
        predicate: (query) => {
          counterFn(query.queryKey[1]);

          return (
            query.queryKey[1].path.approval_policy_id ===
            parameters.path.approval_policy_id
          );
        },
      })
    ).toBeInstanceOf(Promise);

    expect(counterFn.mock.calls).toEqual(
      new Array(counterFn.mock.calls.length).fill([parameters])
    );
  });

  it('supports invalidateQueries with predicate and no queryKey', async () => {
    const { qraft, queryClient } = createClient({
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnMount: false,
          },
        },
      },
    });

    const filesQueryKey = qraft.files.getFiles.getQueryKey({
      header: {
        'x-monite-version': '1.0.0',
      },
      query: {
        id__in: ['1', '2'],
      },
    });

    // Mix with another query to make sure it's not in predicate
    await queryClient.fetchQuery({
      queryKey: filesQueryKey,
      queryFn: () =>
        qraft.files.getFiles({ queryKey: filesQueryKey, baseUrl }, requestFn),
    });

    const { result: result_01 } = renderHook(
      () => qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
      expect(result_01.current.isFetching).toBeFalsy();
    });

    const counterFn =
      vi.fn<
        [typeof qraft.approvalPolicies.getApprovalPoliciesId.types.parameters]
      >();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
        infinite: false,
        predicate: (query) => {
          counterFn(query.queryKey[1]);
          return true;
        },
      })
    ).toBeInstanceOf(Promise);

    expect(counterFn.mock.calls).toEqual(
      new Array(counterFn.mock.calls.length).fill([parameters])
    );
  });
});

describe('Qraft uses Queries Removal', () => {
  const parameters_1: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  const parameters_2: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '2',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports removeQueries by parameters', async () => {
    const { qraft, queryClient } = createClient();

    const { result: result_01 } = renderHook(
      () => {
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters_2);

        return qraft.approvalPolicies.getApprovalPoliciesId.useQuery(
          parameters_1
        );
      },
      {
        wrapper: (props: { children: ReactNode }) => (
          <Providers {...props} queryClient={queryClient} />
        ),
      }
    );

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
    });

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters_1)
    ).toBeDefined();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters_2)
    ).toBeDefined();

    qraft.approvalPolicies.getApprovalPoliciesId.removeQueries({
      parameters: parameters_1,
      infinite: false,
    });

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters_1)
    ).not.toBeDefined();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters_2)
    ).toBeDefined();
  });

  it('supports removeQueries without parameters', async () => {
    const { qraft, queryClient } = createClient();

    const { result: result_01 } = renderHook(
      () => {
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters_2);

        return qraft.approvalPolicies.getApprovalPoliciesId.useQuery(
          parameters_1
        );
      },
      {
        wrapper: (props: { children: ReactNode }) => (
          <Providers {...props} queryClient={queryClient} />
        ),
      }
    );

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
    });

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters_1)
    ).toBeDefined();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters_2)
    ).toBeDefined();

    qraft.approvalPolicies.getApprovalPoliciesId.removeQueries();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters_1)
    ).not.toBeDefined();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters_2)
    ).not.toBeDefined();
  });
});

describe('Qraft uses Queries Cancellation', () => {
  const parameters: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports cancelQueries by parameters', async () => {
    const { qraft, queryClient } = createClient();

    const counterFn = vi.fn();

    const { result: result_01 } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters, {
          queryFn({ signal }) {
            return new Promise((_, reject) =>
              signal.addEventListener('abort', () => {
                counterFn();
                reject(new Error('cancelQueries succeeded'));
              })
            );
          },
        }),
      {
        wrapper: (props: { children: ReactNode }) => (
          <Providers {...props} queryClient={queryClient} />
        ),
      }
    );

    expect(result_01.current.isError).toBeFalsy();

    await expect(
      qraft.approvalPolicies.getApprovalPoliciesId.cancelQueries({
        parameters,
        infinite: false,
      })
    ).resolves.toBeUndefined();

    expect(counterFn.mock.calls.length).toEqual(1);
  });

  it('supports cancelQueries without parameters', async () => {
    const { qraft, queryClient } = createClient();

    const counterFn = vi.fn();

    const { result: result } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters, {
          queryFn({ signal }) {
            return new Promise((_, reject) =>
              signal.addEventListener('abort', () => {
                counterFn();
                reject(new Error('cancelQueries succeeded'));
              })
            );
          },
        }),
      {
        wrapper: (props: { children: ReactNode }) => (
          <Providers {...props} queryClient={queryClient} />
        ),
      }
    );

    expect(result.current.isFetching).toBeTruthy();

    act(() => {
      qraft.approvalPolicies.getApprovalPoliciesId.cancelQueries();
    });

    expect(counterFn.mock.calls.length).toEqual(1);
  });
});

describe('Qraft uses Queries Refetch', () => {
  const parameters: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports refetchQueries by parameters', async () => {
    const { qraft, queryClient } = createClient();

    const counterFn = vi.fn();

    const hook = () =>
      qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters, {
        queryFn() {
          return new Promise((resolve) => {
            counterFn();
            return resolve(parameters);
          });
        },
      });

    const { result: result_01 } = renderHook(hook, {
      wrapper: (props: { children: ReactNode }) => (
        <Providers {...props} queryClient={queryClient} />
      ),
    });

    await waitFor(() => {
      expect(result_01.current.isSuccess).toBeTruthy();
    });

    expect(counterFn.mock.calls.length).toEqual(1);

    act(() => {
      qraft.approvalPolicies.getApprovalPoliciesId.refetchQueries({
        parameters,
        infinite: false,
      });
    });

    expect(counterFn.mock.calls.length).toEqual(2);
  });
});

describe('Qraft uses Queries Reset', () => {
  const parameters: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports resetQueries by parameters', async () => {
    const { qraft, queryClient } = createClient();

    const initialData = {
      ...parameters,
      header: {
        'x-monite-version': 'initial data',
      },
    };

    const { result: result_01 } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery(parameters, {
          initialData,
        }),
      {
        wrapper: (props: { children: ReactNode }) => (
          <Providers {...props} queryClient={queryClient} />
        ),
      }
    );

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters)
    ).toEqual(initialData);

    await waitFor(() => {
      expect(result_01.current.data).toEqual(parameters);
    });

    act(() => {
      qraft.approvalPolicies.getApprovalPoliciesId.resetQueries({
        parameters,
        infinite: false,
      });
    });

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryData(parameters)
    ).toEqual(initialData);
  });
});

describe('Qraft uses IsFetching Query', () => {
  const parameters: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports isFetching with specific parameters', async () => {
    const { qraft, queryClient } = createClient();

    renderHook(
      () => {
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery({
          ...parameters,
          header: {
            'x-monite-version': '1.2.0',
          },
        });

        return qraft.approvalPolicies.getApprovalPoliciesId.useQuery(
          parameters
        );
      },
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.isFetching({
        parameters,
        infinite: false,
      })
    ).toEqual(1);
  });

  it('supports isFetching without specific parameters', async () => {
    const { qraft, queryClient } = createClient();

    renderHook(
      () => {
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery({
          ...parameters,
          header: {
            'x-monite-version': '1.2.0',
          },
        });

        return qraft.approvalPolicies.getApprovalPoliciesId.useQuery(
          parameters
        );
      },
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(qraft.approvalPolicies.getApprovalPoliciesId.isFetching()).toEqual(
      2
    );
  });
});

describe('Qraft uses IsMutating Query', () => {
  const parameters: Services['entities']['postEntitiesIdDocuments']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        entity_id: '1',
      },
      query: {
        referer: 'https://example.com',
      },
    };

  it('supports isMutating with specific parameters', async () => {
    const { qraft, queryClient } = createClient();

    const { result } = renderHook(
      () => {
        qraft.entities.postEntitiesIdDocuments.useMutation({
          ...parameters,
          header: {
            'x-monite-version': '1.2.0',
          },
        });

        return qraft.entities.postEntitiesIdDocuments.useMutation(parameters);
      },
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      result.current.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    expect(
      qraft.entities.postEntitiesIdDocuments.isMutating({ parameters })
    ).toEqual(1);
  });

  it('supports isMutating without specific parameters', async () => {
    const { qraft, queryClient } = createClient();

    const { result: mutationResult } = renderHook(
      () => {
        return {
          mutation_01:
            qraft.entities.postEntitiesIdDocuments.useMutation(parameters),
          mutation_02: qraft.entities.postEntitiesIdDocuments.useMutation({
            ...parameters,
            header: {
              'x-monite-version': '2.2.2',
            },
          }),
        };
      },
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    act(() => {
      mutationResult.current.mutation_01.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
      mutationResult.current.mutation_02.mutate({
        verification_document_back: 'back',
        verification_document_front: 'front',
      });
    });

    expect(qraft.entities.postEntitiesIdDocuments.isMutating()).toEqual(2);
  });
});

describe('Qraft uses useIsFetching Query', () => {
  const parameters: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports useIsFetching with specific parameters', async () => {
    const { qraft, queryClient } = createClient();

    renderHook(
      () => {
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery({
          ...parameters,
          header: {
            'x-monite-version': '1.2.0',
          },
        });

        return qraft.approvalPolicies.getApprovalPoliciesId.useQuery(
          parameters
        );
      },
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    const { result } = renderHook(
      () =>
        qraft.approvalPolicies.getApprovalPoliciesId.useIsFetching({
          parameters,
          infinite: false,
        }),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(result.current).toEqual(1);
  });

  it('supports useIsFetching without specific parameters', async () => {
    const { qraft, queryClient } = createClient();

    renderHook(
      () => {
        qraft.approvalPolicies.getApprovalPoliciesId.useQuery({
          ...parameters,
          header: {
            'x-monite-version': '1.2.0',
          },
        });

        return qraft.approvalPolicies.getApprovalPoliciesId.useQuery(
          parameters
        );
      },
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    const { result } = renderHook(
      () => qraft.approvalPolicies.getApprovalPoliciesId.useIsFetching(),
      {
        wrapper: (props) => <Providers {...props} queryClient={queryClient} />,
      }
    );

    expect(result.current).toEqual(2);
  });
});

describe('Qraft uses getQueryKey', () => {
  it('returns query key with parameters', async () => {
    const { qraft } = createClient();

    expect(
      qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          approval_policy_id: '1',
        },
        query: {
          items_order: ['asc', 'desc'],
        },
      })
    ).toEqual([
      {
        url: qraft.approvalPolicies.getApprovalPoliciesId.schema.url,
        method: qraft.approvalPolicies.getApprovalPoliciesId.schema.method,
        infinite: false,
        security: qraft.approvalPolicies.getApprovalPoliciesId.schema.security,
      },
      {
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          approval_policy_id: '1',
        },
        query: {
          items_order: ['asc', 'desc'],
        },
      },
    ]);
  });

  it('returns query key without parameters', async () => {
    const { qraft } = createClient();

    expect(qraft.approvalPolicies.getApprovalPoliciesId.getQueryKey()).toEqual([
      {
        url: qraft.approvalPolicies.getApprovalPoliciesId.schema.url,
        method: qraft.approvalPolicies.getApprovalPoliciesId.schema.method,
        security: qraft.approvalPolicies.getApprovalPoliciesId.schema.security,
        infinite: false,
      },
      {},
    ]);
  });
});

describe('Qraft uses getMutationKey', () => {
  it('returns mutation key with parameters', async () => {
    const { qraft } = createClient();

    expect(
      qraft.entities.postEntitiesIdDocuments.getMutationKey({
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
        body: {
          verification_document_back: 'back',
          verification_document_front: 'front',
        },
      })
    ).toEqual([
      {
        url: qraft.entities.postEntitiesIdDocuments.schema.url,
        method: qraft.entities.postEntitiesIdDocuments.schema.method,
      },
      {
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          entity_id: '1',
        },
        query: {
          referer: 'https://example.com',
        },
      },
    ]);
  });

  it('returns mutation key without parameters', async () => {
    const { qraft } = createClient();

    expect(qraft.entities.postEntitiesIdDocuments.getMutationKey()).toEqual([
      {
        url: qraft.entities.postEntitiesIdDocuments.schema.url,
        method: qraft.entities.postEntitiesIdDocuments.schema.method,
      },
      {},
    ]);
  });
});

describe('Qraft respects Types', () => {
  const parameters: Services['approvalPolicies']['getApprovalPoliciesId']['types']['parameters'] =
    {
      header: {
        'x-monite-version': '1.0.0',
      },
      path: {
        approval_policy_id: '1',
      },
      query: {
        items_order: ['asc', 'desc'],
      },
    };

  it('supports infinite QueryKey predicate query filter strict types', () => {
    const { qraft, queryClient } = createClient();

    qraft.approvalPolicies.getApprovalPoliciesId.getQueriesData({
      queryKey: [
        {
          ...qraft.approvalPolicies.getApprovalPoliciesId.schema,
          infinite: true,
        },
        parameters,
      ],
      predicate: (query) => {
        // Will report TS error if 'false'
        const _isTrue = query.queryKey?.[0]?.infinite === true; // todo::improve type checking

        return Boolean(
          // Check if queryKey has a correct type
          query.queryKey?.[1]?.query?.items_order?.includes('asc')
        );
      },
    });
  });

  it('supports regular QueryKey predicate query filter strict types', () => {
    const { qraft } = createClient();

    qraft.approvalPolicies.getApprovalPoliciesId.getQueriesData({
      queryKey: [
        {
          ...qraft.approvalPolicies.getApprovalPoliciesId.schema,
          infinite: false,
        },
        parameters,
      ],
      predicate: (query) => {
        // Will report TS error if 'true'
        const _isTrue = query.queryKey?.[0]?.infinite === false; // todo::improve type checking

        return Boolean(
          query.queryKey?.[1]?.query?.items_order?.includes('asc')
        );
      },
    });
  });

  it('supports regular parameters predicate query filter strict types', () => {
    const { qraft, queryClient } = createClient();

    qraft.approvalPolicies.getApprovalPoliciesId.getQueriesData({
      parameters,
      infinite: false,
      predicate: (query) => {
        // Will report TS error if 'true'
        const _isTrue = query.queryKey?.[0]?.infinite === false; // todo::improve type checking

        return Boolean(
          query.queryKey?.[1]?.query?.items_order?.includes('asc')
        );
      },
    });
  });

  it('does not supports  predicate without ', () => {
    const { qraft, queryClient } = createClient();

    qraft.approvalPolicies.getApprovalPoliciesId.getQueriesData({
      // @ts-expect-error - `query` should be infinite or regular query, todo::improve type checking
      predicate: (query) => {
        // Will report TS error if 'true'
        const _isInfinite =
          query.queryKey?.[0] && 'infinite' in query.queryKey[0];

        return Boolean(
          query.queryKey?.[1]?.query?.items_order?.includes('asc')
        );
      },
    });
  });
});

describe('Qraft is type-safe on Query Filters', () => {
  it('does not emit an error on the `exact` key', () => {
    const { qraft, queryClient } = createClient();

    qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
      exact: true,
      parameters: {
        header: {
          'x-monite-version': '1.0.0',
        },
        path: {
          approval_policy_id: '1',
        },
        query: {
          items_order: ['asc', 'desc'],
        },
      },
    });
  });

  it('emits an error on the `exact` key and partial parameters', () => {
    const { qraft, queryClient } = createClient();

    // Header is required, must emit an error
    qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
      exact: true,
      // @ts-expect-error - `header` is required, must emit an error
      parameters: {
        // header: {
        //   'x-monite-version': '1.0.0',
        // },
        path: {
          approval_policy_id: '1',
        },
        query: {
          items_order: ['asc', 'desc'],
        },
      },
    });
  });

  it('does not emit an error when `exact` is not specified', () => {
    const { qraft, queryClient } = createClient();

    qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
      // Partial parameters
      parameters: {
        query: {
          items_order: ['asc', 'desc'],
        },
      },
    });
  });

  it('does not emit an error when `exact` is `false`', () => {
    const { qraft, queryClient } = createClient();

    qraft.approvalPolicies.getApprovalPoliciesId.invalidateQueries({
      // Partial parameters
      exact: false,
      parameters: {
        query: {
          items_order: ['asc', 'desc'],
        },
      },
    });
  });
});

function Providers({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

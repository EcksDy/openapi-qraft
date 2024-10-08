import { ServiceOperation } from '@openapi-qraft/plugin/lib/open-api/getServices';
import ts from 'typescript';

const SERVICE_OPERATION_QUERY = 'ServiceOperationQuery';
const SERVICE_OPERATION_MUTATION = 'ServiceOperationMutation';

const factory = ts.factory;

export type ServiceImportsFactoryOptions = {
  openapiTypesImportPath: string;
  operationGenericsImportPath: string;
};

export const getServiceFactory = (
  service: { typeName: string; variableName: string },
  operations: ServiceOperation[],
  {
    openapiTypesImportPath,
    operationGenericsImportPath,
  }: ServiceImportsFactoryOptions
) => {
  return [
    getOpenAPISchemaImportsFactory(openapiTypesImportPath),
    getServiceOperationGenericsPathImportsFactory(
      operationGenericsImportPath,
      operations
    ),
    getServiceInterfaceFactory(service, operations),
    getServiceVariableFactory(service, operations),
  ];
};

const getOpenAPISchemaImportsFactory = (schemaTypesPath: string) => {
  const factory = ts.factory;

  return factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      true,
      undefined,
      factory.createNamedImports([
        factory.createImportSpecifier(
          false,
          undefined,
          factory.createIdentifier('paths')
        ),
      ])
    ),
    factory.createStringLiteral(schemaTypesPath)
  );
};

const getServiceOperationGenericsPathImportsFactory = (
  operationGenericsPath: string,
  operations: ServiceOperation[]
) => {
  const factory = ts.factory;

  const queryMethods = ['get', 'head', 'options'] as const; // todo::make it shared

  return factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      true,
      undefined,
      factory.createNamedImports(
        [
          operations.some((operation) =>
            queryMethods.some((method) => method === operation.method)
          )
            ? factory.createImportSpecifier(
                false,
                undefined,
                factory.createIdentifier('ServiceOperationQuery')
              )
            : null,
          operations.some(
            (operation) =>
              !queryMethods.some((method) => method === operation.method)
          )
            ? factory.createImportSpecifier(
                false,
                undefined,
                factory.createIdentifier('ServiceOperationMutation')
              )
            : null,
        ].filter((node): node is NonNullable<typeof node> => Boolean(node))
      )
    ),
    factory.createStringLiteral(operationGenericsPath)
  );
};

const getServiceInterfaceFactory = (
  { typeName }: { typeName: string },
  operations: ServiceOperation[]
) => {
  return factory.createInterfaceDeclaration(
    [factory.createToken(ts.SyntaxKind.ExportKeyword)],
    factory.createIdentifier(typeName),
    undefined,
    undefined,
    operations.map(getServiceInterfaceOperationFactory)
  );
};

const getServiceInterfaceOperationFactory = (operation: ServiceOperation) => {
  const node = factory.createPropertySignature(
    undefined,
    factory.createIdentifier(operation.name),
    undefined,
    factory.createTypeReferenceNode(
      factory.createIdentifier(
        operation.method === 'get'
          ? SERVICE_OPERATION_QUERY
          : SERVICE_OPERATION_MUTATION
      ),
      [
        getOperationSchemaFactory(operation),

        operation.method !== 'get' ? getOperationBodyFactory(operation) : null,

        getOperationResponseFactory(operation, 'success'),

        getOperationParametersFactory(operation),

        getOperationResponseFactory(operation, 'errors'),
      ].filter((node): node is NonNullable<typeof node> => Boolean(node))
    )
  );

  addSyntheticLeadingOperationComment(node, operation);

  return node;
};

const getOperationSchemaFactory = (operation: ServiceOperation) => {
  return factory.createTypeLiteralNode(
    [
      factory.createPropertySignature(
        undefined,
        factory.createIdentifier('method'),
        undefined,
        factory.createLiteralTypeNode(
          factory.createStringLiteral(operation.method)
        )
      ),

      factory.createPropertySignature(
        undefined,
        factory.createIdentifier('url'),
        undefined,
        factory.createLiteralTypeNode(
          factory.createStringLiteral(operation.path)
        )
      ),

      operation.mediaType
        ? factory.createPropertySignature(
            undefined,
            factory.createIdentifier('mediaType'),
            undefined,
            factory.createLiteralTypeNode(
              factory.createStringLiteral(operation.mediaType)
            )
          )
        : null,

      operation.security
        ? factory.createPropertySignature(
            undefined,
            factory.createIdentifier('security'),
            undefined,
            factory.createTupleTypeNode(
              getOperationSecuritySchemas(operation.security).map(
                (securitySchemaName) =>
                  factory.createLiteralTypeNode(
                    factory.createStringLiteral(securitySchemaName)
                  )
              )
            )
          )
        : null,
    ].filter((node): node is NonNullable<typeof node> => Boolean(node))
  );
};

const getOperationResponseFactory = (
  operation: ServiceOperation,
  type: 'success' | 'errors'
) => {
  if (!operation[type])
    return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);

  const responses = Object.entries(operation[type]);

  if (!responses.length)
    return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);

  return factory.createUnionTypeNode(
    responses.map(([statusCode, mediaType]) => {
      if (!mediaType)
        return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);

      return factory.createIndexedAccessTypeNode(
        factory.createIndexedAccessTypeNode(
          factory.createIndexedAccessTypeNode(
            factory.createIndexedAccessTypeNode(
              factory.createIndexedAccessTypeNode(
                factory.createIndexedAccessTypeNode(
                  factory.createTypeReferenceNode(
                    factory.createIdentifier('paths'),
                    undefined
                  ),
                  factory.createLiteralTypeNode(
                    factory.createStringLiteral(operation.path)
                  )
                ),
                factory.createLiteralTypeNode(
                  factory.createStringLiteral(operation.method)
                )
              ),
              factory.createLiteralTypeNode(
                factory.createStringLiteral('responses')
              )
            ),
            factory.createLiteralTypeNode(
              factory.createStringLiteral(statusCode)
            )
          ),
          factory.createLiteralTypeNode(factory.createStringLiteral('content'))
        ),
        factory.createLiteralTypeNode(factory.createStringLiteral(mediaType))
      );
    })
  );
};

const getOperationBodyFactory = (operation: ServiceOperation) => {
  if (!operation.mediaType)
    return factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);

  return factory.createIndexedAccessTypeNode(
    factory.createIndexedAccessTypeNode(
      factory.createTypeReferenceNode(factory.createIdentifier('NonNullable'), [
        factory.createIndexedAccessTypeNode(
          factory.createIndexedAccessTypeNode(
            factory.createIndexedAccessTypeNode(
              factory.createTypeReferenceNode(
                factory.createIdentifier('paths'),
                undefined
              ),
              factory.createLiteralTypeNode(
                factory.createStringLiteral(operation.path)
              )
            ),
            factory.createLiteralTypeNode(
              factory.createStringLiteral(operation.method)
            )
          ),
          factory.createLiteralTypeNode(
            factory.createStringLiteral('requestBody')
          )
        ),
      ]),
      // todo::Add optional NonNullable inference, see `POST /entities/{entity_id}/documents`
      factory.createLiteralTypeNode(factory.createStringLiteral('content'))
    ),
    factory.createLiteralTypeNode(
      factory.createStringLiteral(operation.mediaType)
    )
  );
};

const getOperationParametersFactory = (operation: ServiceOperation) => {
  if (!operation.parameters)
    return factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword);

  return factory.createIndexedAccessTypeNode(
    factory.createIndexedAccessTypeNode(
      factory.createIndexedAccessTypeNode(
        factory.createTypeReferenceNode(
          factory.createIdentifier('paths'),
          undefined
        ),
        factory.createLiteralTypeNode(
          factory.createStringLiteral(operation.path)
        )
      ),
      factory.createLiteralTypeNode(
        factory.createStringLiteral(operation.method)
      )
    ),
    factory.createLiteralTypeNode(factory.createStringLiteral('parameters'))
  );
};

const getServiceVariableFactory = (
  { variableName }: { variableName: string },
  operations: ServiceOperation[]
) => {
  return factory.createVariableStatement(
    [factory.createToken(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          factory.createIdentifier(variableName),
          undefined,
          factory.createTypeLiteralNode(
            operations.map(getServiceVariableTypeFactory)
          ),
          factory.createObjectLiteralExpression(
            operations.map(getServiceVariablePropertyFactory),
            true
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );
};

const getServiceVariableTypeFactory = (operation: ServiceOperation) => {
  const node = factory.createPropertySignature(
    undefined,
    factory.createIdentifier(operation.name),
    undefined,
    factory.createTypeLiteralNode([
      factory.createPropertySignature(
        undefined,
        factory.createIdentifier('schema'),
        undefined,
        getOperationSchemaFactory(operation)
      ),
    ])
  );

  addSyntheticLeadingOperationComment(node, operation);

  return node;
};

const getServiceVariablePropertyFactory = (operation: ServiceOperation) => {
  return factory.createPropertyAssignment(
    factory.createIdentifier(operation.name),
    factory.createObjectLiteralExpression(
      [
        factory.createPropertyAssignment(
          factory.createIdentifier('schema'),
          factory.createObjectLiteralExpression(
            [
              factory.createPropertyAssignment(
                factory.createIdentifier('method'),
                factory.createStringLiteral(operation.method)
              ),
              factory.createPropertyAssignment(
                factory.createIdentifier('url'),
                factory.createStringLiteral(operation.path)
              ),
              operation.mediaType
                ? factory.createPropertyAssignment(
                    factory.createIdentifier('mediaType'),
                    factory.createStringLiteral(operation.mediaType)
                  )
                : null,

              operation.security
                ? factory.createPropertyAssignment(
                    factory.createIdentifier('security'),
                    factory.createArrayLiteralExpression(
                      getOperationSecuritySchemas(operation.security).map(
                        (securitySchemaName) =>
                          factory.createStringLiteral(securitySchemaName)
                      )
                    )
                  )
                : null,
            ].filter((node): node is NonNullable<typeof node> => Boolean(node)),
            true
          )
        ),
      ],
      true
    )
  );
};

const createMultilineComment = (comment: string[]) => {
  const output = comment.flatMap((line) =>
    line.includes('\n') ? line.split('\n') : line
  );

  if (output.length) {
    const text =
      output.length === 1
        ? `* ${output.join('\n')} `
        : `*\n * ${output.join('\n * ')}\n `;

    return text.replace(/\*\//g, '*\\/'); // prevent inner comments from leaking
  }

  return '';
};

const createOperationComment = (operation: ServiceOperation) => {
  return createMultilineComment(
    [
      operation.deprecated ? '@deprecated' : null,
      operation.summary ? `@summary ${operation.summary}` : null,
      operation.description ? `@description ${operation.description}` : null,
    ].filter((comment): comment is NonNullable<typeof comment> =>
      Boolean(comment)
    )
  );
};

const addSyntheticLeadingOperationComment = (
  node: ts.Node,
  operation: ServiceOperation
) => {
  const comment = createOperationComment(operation);

  if (comment)
    ts.addSyntheticLeadingComment(
      node,
      ts.SyntaxKind.MultiLineCommentTrivia,
      comment,
      true
    );
};

const getOperationSecuritySchemas = (
  security: NonNullable<ServiceOperation['security']>
) =>
  security.flatMap((security) =>
    Object.keys(security).map((securitySchemaName) => securitySchemaName)
  );

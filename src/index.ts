import * as fs from 'fs';
import * as path from 'path';
import { GraphQLSchema } from 'graphql';
import { GenerateTypescriptOptions, defaultOptions } from './types';
import { TSResolverGenerator, GenerateResolversResult } from './typescriptResolverGenerator';
import { TypeScriptGenerator } from './typescriptGenerator';
import { formatTabSpace, introspectSchema, introspectSchemaViaLocalFile } from './utils';
import { isString } from 'util';
import { IntrospectionQuery } from 'graphql/utilities/introspectionQuery';

export { GenerateTypescriptOptions } from './types';

const packageJson = require(path.join(__dirname, '../package.json'));

const jsDoc =
    `/**
 * This file is auto-generated by ${packageJson.name}
 * Please note that any changes in this file may be overwritten
 */

/* tslint:disable */ `;

const typeDefsDecoration = [
    '/*******************************',
    ' *                             *',
    ' *          TYPE DEFS          *',
    ' *                             *',
    ' *******************************/'
];

const typeResolversDecoration = [
    '/*********************************',
    ' *                               *',
    ' *         TYPE RESOLVERS        *',
    ' *                               *',
    ' *********************************/'
];

export const generateTSTypesAsString = async (schema: GraphQLSchema | string, options: GenerateTypescriptOptions): Promise<string> => {
    const mergedOptions = { ...defaultOptions, ...options };

    let introspectResult: IntrospectionQuery;
    if (isString(schema)) {
        introspectResult = await introspectSchemaViaLocalFile(path.resolve(schema));
    } else {
        introspectResult = await introspectSchema(schema);
    }

    const tsGenerator = new TypeScriptGenerator(mergedOptions);
    const typeDefs = await tsGenerator.generate(introspectResult);

    let typeResolvers: GenerateResolversResult = {
        body: [],
        importHeader: []
    };
    const tsResolverGenerator = new TSResolverGenerator(mergedOptions);
    typeResolvers = await tsResolverGenerator.generate(introspectResult);

    let header = [...typeResolvers.importHeader, jsDoc];

    let body: string[] = [
        ...typeDefsDecoration,
        ...typeDefs,
        ...typeResolversDecoration,
        ...typeResolvers.body
    ];

    if (mergedOptions.namespace) {
        body = [
            `namespace ${options.namespace} {`,
            ...body,
            '}'
        ];
    }

    if (mergedOptions.global) {
        body = [
            'export { };',
            '',
            'declare global {',
            ...body,
            '}'
        ];
    }

    const formatted = formatTabSpace([...header, ...body], mergedOptions.tabSpaces);
    return formatted.join('\n');
};

export async function generateTypeScriptTypes(
    schema: GraphQLSchema | string,
    outputPath: string,
    options: GenerateTypescriptOptions = defaultOptions
) {
    const content = await generateTSTypesAsString(schema, options);
    fs.writeFileSync(outputPath, content, 'utf-8');
}
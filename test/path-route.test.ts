import * as assert from 'node:assert';
import { PathRoute } from '../src/path-route';
import type { PlaceholderParsedPathPartType, ConstraintType, ParamsType } from '../src/path-route';

describe('PathRoute', () => {
    describe('processPathTemplate()', () => {
        it('path without placeholder only generates string parsed parts', () => {
            // arrange
            const route = new PathRoute({ name: 'main-route', path: '/test/sample' });
            const expectedResults = ['', 'test', 'sample'];

            // act
            const parsedResult = route.processPathTemplate();

            // assert
            assert.equal(parsedResult.length, expectedResults.length);
            for (let i = 0; i < parsedResult.length; i += 1) {
                const parsedPart = parsedResult[i];
                assert.equal(parsedPart.path, expectedResults[i]);
            }
        });

        it('path with placeholder generates an identifier parsed path part', () => {
            // arrange
            const route = new PathRoute({
                name: 'main-route',
                path: '/basepath/{innerParam}/prefix-{idParam}-suffix/',
            });
            const expectedResults = ['', 'basepath', '{innerParam}', 'prefix-{idParam}-suffix', ''];
            const expectedInnerParam = {
                prefix: '',
                identifier: 'innerParam',
                suffix: '',
            };
            const expectedIdParam = {
                prefix: 'prefix-',
                identifier: 'idParam',
                suffix: '-suffix',
            };

            // act
            const parsedResult = route.processPathTemplate();
            const identifierPartsResult = [parsedResult[2], parsedResult[3]] as Array<PlaceholderParsedPathPartType>;

            // assert
            assert.equal(parsedResult.length, expectedResults.length);
            for (let i = 0; i < parsedResult.length; i += 1) {
                const parsedPart = parsedResult[i];
                assert.equal(parsedPart.path, expectedResults[i]);
            }

            const expectedIdentifiers = [expectedInnerParam, expectedIdParam];
            for (let i = 0; i < expectedIdentifiers.length; i += 1) {
                const expected = expectedIdentifiers[i];
                const actual = identifierPartsResult[i];

                assert.equal(actual.prefix, expected.prefix);
                assert.equal(actual.identifier, expected.identifier);
                assert.equal(actual.suffix, expected.suffix);
            }
        });

        it('only accepts greedy placeholder as the last element', () => {
            // arrange
            const routeA = new PathRoute({
                name: 'routeA',
                path: '/base/{identifier}/{*greedyIdentifier}',
            });
            const expectedPartTypesRouteA = ['string', 'string', 'placeholder', 'greedy'];

            const routeB = new PathRoute({
                name: 'routeB',
                path: '/base/{*greedyIdentifier}/more-path',
            });
            const expectedPartTypesRouteB = ['string', 'string', 'string', 'string'];

            // act
            const parsedRouteAResults = routeA.processPathTemplate();

            const parsedRouteBResults = routeB.processPathTemplate();

            // assert
            for (let i = 0; i < parsedRouteAResults.length; i += 1) {
                assert.equal(parsedRouteAResults[i].type, expectedPartTypesRouteA[i])
            }

            for (let i = 0; i < parsedRouteBResults.length; i += 1) {
                assert.equal(parsedRouteBResults[i].type, expectedPartTypesRouteB[i])
            }
        });
    });

    describe('_validateConstraintDefinitions()', () => {
        it(`throws an Error if constraints have identifier not present in the pathTemplate`, () => {
            // arrange
            const pathTemplate = '/{firstIdentifier}/path/parts/{secondIdentifier}';
            const constraints = { firstIdentifier: /\d+/, inexistentIdentifier: /\w+/ };

            // act
            try {
                new PathRoute({
                    name: 'route-name',
                    path: pathTemplate,
                    constraints,
                });
            } catch (error) {
                assert.notEqual(error, null);
                return;
            }

            assert.fail('invalid constraints should cause error on route instantiation');
        });

        it(`doesn't throw if all constraints exist in the pathTemplate`, () => {
            // arrange
            const pathTemplate = '/basePath/{controller}/{action}/{id}/{*tail}';
            const constraints = { action: /\w+/, id: /\d+/, tail: /\D+/ };

            // act
            try {
                new PathRoute({
                    name: 'route-name',
                    path: pathTemplate,
                    constraints,
                });
            } catch (e: any) {
                console.log(e, e.message);
                assert.fail('valid constraints should not throw Error on create');
            }

            assert.ok(true);
        })
    });

    describe('_applyConstraintsToParsedTemplate()', () => {
        it('sets the constraint property related by the identifer of a placeholder parsed template part', () => {
            // arrange
            const path = 'base/{controller}/{action}';
            const constraints = { controller: /\w+/, action: /\D+/ };

            // act
            const route = new PathRoute({ name: 'testRoute', path, constraints });
            const controllerParsedPart = route.parsedPathTemplate[1] as PlaceholderParsedPathPartType;
            const actionParsedPart = route.parsedPathTemplate[2] as PlaceholderParsedPathPartType;

            // assert
            assert.equal(controllerParsedPart.constraint, constraints.controller);
            assert.equal(actionParsedPart.constraint, constraints.action);
        });
    });

    describe('match()', () => {
        // #region [ Non-matches tests ]
        const notMatchesTestCases = [
            { input: '/simpleroute', routeConfig: {path: '/simpleroute/anotherPath'} },
            { input: '/basepath', routeConfig: {path: 'basepath'} },
            { input: '/partA/partB', routeConfig: {path: '/partA'} },
            {
                routeConfig: {
                    path: '/res/{action}/{id}',
                    constraints: {
                        action: PathRoute.WordParam,
                        id: PathRoute.NumericParam
                    } as ConstraintType,
                },
                input: '/res/edit/invalid-id',
            },
            {
                routeConfig: {
                    path: 'resource/{resourceId}',
                },
                input: 'resource',
            },
            {
                routeConfig: {
                    path: '/base/{*all}',
                    constraints: { all: PathRoute.NonDigitParam } as ConstraintType,
                },
                input: '/base/deep/greedy/invalid1/path10',
            }
        ];
        notMatchesTestCases.forEach((testCase) => {
            it(`return null if the given path is not a match: ${testCase.routeConfig.path}`, () => {
                // arrange
                const pathInput = testCase.input;
                const route = new PathRoute({ name: 'routeName', ...testCase.routeConfig });

                // act
                const result = route.match(pathInput);

                // assert
                assert.equal(result, null);
            });
        });
        // #endregion

        // #region [ Match tests ]
        const matchTestCases = [
            { input: '/', routeConfig: {path: '/'}, expected: {} },
            { input: '/simpleroute', routeConfig: {path: '/simpleroute'}, expected: {} },
            { input: '/partA/partB', routeConfig: {path: '/partA/partB'}, expected: {} },
            {
                routeConfig: {
                    path: '/res/{action}/{id}',
                    constraints: { action: PathRoute.WordParam, id: PathRoute.NumericParam } as ConstraintType,
                },
                input: '/res/edit/10',
                expected: { action: 'edit', id: '10' },
            },
            {
                routeConfig: { path: '/base/{*all}' },
                input: '/base/deep/greedy/path/id100',
                expected: { all: 'deep/greedy/path/id100' },
            },
            {
                routeConfig: { path: '/resource/base:{resourceId}/auth' },
                input: '/resource/base:permission/auth',
                expected: { resourceId: 'permission' },
            },
            {
                routeConfig: { path: '/{base}/id-{type}/t{subtype}Controller' },
                input: '/core/id-main/tUserController',
                expected: {
                    base: 'core',
                    type: 'main',
                    subtype: 'User',
                },
            },
            {
                routeConfig: {
                    path: '/{resource}/{action}/{id}',
                    constraints: { id: PathRoute.OptionalParam },
                },
                input: '/user/new',
                expected: {
                    resource: 'user',
                    action: 'new',
                    id: '',
                },
            },
            {
                routeConfig: {
                    path: '/{resource}/{action}/{id}',
                    defaults: { id: '' } as ParamsType,
                },
                input: '/user/new/',
                expected: {
                    resource: 'user',
                    action: 'new',
                    id: '',
                },
            },
            {
                routeConfig: {
                    path: '/{controller}/{action}/{id}',
                    constraints: { id: PathRoute.OptionalParam },
                    defaults: { controller: 'home', action: 'index', id: '' } as ParamsType,
                },
                input: '/',
                expected: { controller: 'home', action: 'index', id: '' },
            },
            {
                routeConfig: {
                    path: '/{controller}/ns/{method}/{*innerPath}',
                    defaults: { method: 'list', innerPath: '' },
                },
                input: '/testController/ns/testMethod/inner/greedy/path/100',
                expected: {
                    controller: 'testController',
                    method: 'testMethod',
                    innerPath: 'inner/greedy/path/100',
                },
            },
        ];
        matchTestCases.forEach((testCase) => {
            it(`returns the correct params if the route is a match: ${testCase.routeConfig.path}`, () => {
                // arrange
                const inputPath = testCase.input;
                const route = new PathRoute({ name: 'routeName', ...testCase.routeConfig });
                const expectedParams = testCase.expected;

                // act
                const resultParams = route.match(inputPath);

                // assert
                assert.deepEqual(resultParams, expectedParams);
            });
        });
        // #endregion
    });

    describe('buildPathByParams()', () => {
        const buildpathTestCases = [
            {
                message: 'route without placeholders returns its path',
                routeConfig: { path: '/placeholderless/route' },
                input: {} as ParamsType,
                expected: '/placeholderless/route',
            },
            {
                message: 'provided params are used to replace placeholders',
                routeConfig: { path: '/{controller}/{action}' },
                input: { controller: 'opts', action: 'edit' } as ParamsType,
                expected: '/opts/edit',
            },
            {
                message: 'default values are used for missing placeholders',
                routeConfig: {
                    path: '/api/{controller}/{action}/{id}',
                    defaults: { id: '' } as ParamsType,
                },
                input: { controller: 'home', action: 'index' } as ParamsType,
                expected: '/api/home/index/',
            },
            {
                message: 'default values are used for missing placeholders, even when they\'re not the last empty param',
                routeConfig: {
                    path: '/base/{orgId}/{controller}/{action}/',
                    defaults: { controller: 'home', action: 'index' },
                },
                input: { orgId: 'test-org', action: 'list' } as ParamsType,
                expected: '/base/test-org/home/list/',
            },
            {
                message: 'returns null if not all placeholders are provided',
                routeConfig: { path: '/base/{path}' },
                input: {} as ParamsType,
                expected: null,
            },
            {
                message: 'constraints are checked when building a path for route',
                routeConfig: {
                    path: '/base/{parent}/child{childName}/{childId}',
                    constraints: {
                        parent: PathRoute.WordParam,
                        childName: PathRoute.AlphaParam,
                        childId: PathRoute.NumericParam,
                    },
                    defaults: { parent: 'root' },
                },
                input: { childName: '102984', childId: '1' } as ParamsType,
                expected: null,
            },
        ];
        buildpathTestCases.forEach((testCase) => {
            it(`${testCase.message}`, () => {
                // arrange
                const input = testCase.input;
                const route = new PathRoute({ name: 'routeName', ...testCase.routeConfig });

                // act
                const result = route.buildPathByParams(input);

                // assert
                assert.equal(result, testCase.expected);
            });
        });
    });
});


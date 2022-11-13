import * as assert from 'node:assert';
import { PathRoute } from '../src/path-route';
import type { PlaceholderParsedPathPartType, ConstraintType } from '../src/path-route';

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
                input: '/res/edit/invalidId-10',
                routeConfig: {
                    path: '/res/{action}/{id}',
                    constraints: {
                        action: PathRoute.WordParam,
                        id: PathRoute.NumericParam
                    } as ConstraintType,
                },
            },
            {
                input: '/base/deep/greedy/invalid1/path10',
                routeConfig: {
                    path: '/base/{*all}',
                    constraints: { all: PathRoute.NonDigitParam } as ConstraintType,
                },
            }
        ];
        notMatchesTestCases.forEach((params) => {
            it('return null if the given path is not a match', () => {
                // arrange
                const pathInput = params.input;
                const route = new PathRoute({ name: 'routeName', ...params.routeConfig });

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
                input: '/res/edit/10',
                routeConfig: {
                    path: '/res/{action}/{id}',
                    constraints: { action: PathRoute.WordParam, id: PathRoute.NumericParam } as ConstraintType,
                },
                expected: { action: 'edit', id: '10' },
            },
            {
                input: '/base/deep/greedy/path/id100',
                routeConfig: { path: '/base/{*all}' },
                expected: { all: 'deep/greedy/path/id100' },
            },
            {
                input: '/resource/base:permission/auth',
                routeConfig: { path: '/resource/base:{resourceId}/auth' },
                expected: { resourceId: 'permission' },
            },
            {
                input: '/core/id-main/tUserController',
                routeConfig: { path: '/{base}/id-{type}/t{subtype}Controller' },
                expected: {
                    base: 'core',
                    type: 'main',
                    subtype: 'User',
                },
            },
            {
                input: '/user/new/',
                routeConfig: {
                    path: '/{resource}/{action}/{id}',
                    constraints: { id: PathRoute.OptionalParam },
                },
                expected: {
                    resource: 'user',
                    action: 'new',
                    id: '',
                },
            },
        ];
        matchTestCases.forEach((params) => {
            it('returns the correct params if the route is a match', () => {
                // arrange
                const inputPath = params.input;
                const route = new PathRoute({ name: 'routeName', ...params.routeConfig });
                const expectedParams = params.expected;

                // act
                const resultParams = route.match(inputPath);

                // assert
                assert.deepEqual(resultParams, expectedParams);
            });
        });
        // #endregion
    });

    describe('buildPathByParams()', () => {
        it('return null if the given path is not a match', () => {
            // arrange
        });
    });
});


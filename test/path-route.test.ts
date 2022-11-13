import * as assert from 'node:assert';
import { PathRoute } from '../src/path-route';
import type { PlaceholderParsedPathPartType } from '../src/path-route';

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
                path: '/basepath/{innerParam}/prefix-{idParam}-suffix',
            });
            const expectedResults = ['', 'basepath', '{innerParam}', 'prefix-{idParam}-suffix'];
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

    describe('validateConstraintDefinitions()', () => {
        it(`throws an Error if constraints have identifier not present in the pathTemplate`, () => {
            // arrange
            const pathTemplate = '/{firstIdentifier}/path/parts/{secondIdentifier}';
            const constraints = {firstIdentifier: /\d+/, inexistentIdentifier: /\w+/};

            // act
            try {
                const route = new PathRoute({
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
            const constraints = {action: /\w+/, id: /\d+/, tail: /\D+/};

            // act
            try {
                const route = new PathRoute({
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
});


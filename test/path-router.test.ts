import * as assert from 'node:assert';
import type { ParamsType } from '../src/path-route';
import type { HandlerParamsType } from '../src/path-route-default-handler';
import { PathRouter } from '../src/path-router';

describe('PathRouter', () => {
    describe('addRoute()', () => {
        it(`doesn't accept two routes with the same name`, () => {
            // arrange
            const pathRouter = new PathRouter({ defaultRouteHandler: async () => null });
            const routeName = 'base-route';

            // act
            pathRouter.addRoute({
                name: routeName,
                path: 'some:path',
            });

            try {
                pathRouter.addRoute({
                    name: routeName,
                    path: 'another:path',
                });
                assert.fail('Routes with the same name should throw an error');
            } catch (e) {
                assert.ok(e);
            }
        });

        it(`requires a handler when the router doesn't have a default handler`, () => {
            // arrange
            const pathRouter = new PathRouter();

            // act / assert
            try {
                pathRouter.addRoute({
                    name: 'route',
                    path: 'some:path',
                });

                assert.fail('a route without a handler should throw an error');
            } catch (e) {
                assert.ok(e);
            }
        });

        it(`routes can be added with an optional handler, even when the router has a default handler`, () => {
            // arrange
            const pathRouter = new PathRouter({
                defaultRouteHandler: async () => null,
            });

            // act
            try {
                pathRouter.addRoute({
                    name: 'routeA',
                    path: 'route:a',
                    handler: async () => 'handlerA',
                });

                pathRouter.addRoute({
                    name: 'routeB',
                    path: 'route:b',
                });
            } catch (e) {
                assert.fail(`adding explicit handler for a route shouldn't throw an error: ${(e as Error).message}`);
            }
        });
    });

    describe('findMatch()', () => {
        it('finds the proper route configuration given a matching path', () => {
            // arrange
            const routePath = 'user:1';
            const pathRouter = new PathRouter({ defaultRouteHandler: async () => null });
            pathRouter.addRoute({
                name: 'test-route',
                path: '{resource}:{id}',
            });

            // act
            const match = pathRouter.findMatch(routePath);

            // assert
            assert.notEqual(null, match);

            const route = match!.routeConfig.route;
            const params = match!.params;
            assert.equal(route.name, 'test-route');
            assert.equal(params.resource, 'user');
            assert.equal(params.id, '1');
        });

        it('returns null if no matching route is found', () => {
            // arrange
            const routePath = 'route:path';
            const pathRouter = new PathRouter({ defaultRouteHandler: async () => null });
            pathRouter.addRoute({
                name: 'test-route',
                path: 'route:path:mismatch1',
            });
            pathRouter.addRoute({
                name: 'test-route2',
                path: 'route:path:mismatch2',
            });

            // act
            const match = pathRouter.findMatch(routePath);

            // assert
            assert.equal(null, match);
        });
    });

    describe('executeRoute()', () => {
        it(`properly execute the handler for the matching route`, async () => {
            // arrange
            const pathRouter = new PathRouter({
                routeSeparator: '/',
                defaultRouteHandler: async (pathInfo) => {
                    return pathInfo.path;
                },
            }).addRoute({
                name: 'intialRoute',
                path: '/test/route',
            });

            // act
            const result = await pathRouter.executeRoute('/test/route');

            // assert
            assert.equal(result, '/test/route');
        });

        it(`dispatches the missing handler when no route matches the given path`, async () => {
            // arrange
            const pathRouter = new PathRouter({
                defaultRouteHandler: async () => null,
                defaultMissingRouteHandler: async () => 'missing-route',
            }).addRoutes([
                {
                    name: 'route-a',
                    path: ':route:a',
                },
                {
                    name: 'route-b',
                    path: ':route:b',
                },
                {
                    name: 'route-all',
                    path: ':route:{id}'
                },
            ]);

            const givenRoute = ':resoure:nonmatching';

            // act
            const result = await pathRouter.executeRoute(givenRoute);

            // assert
            assert.equal(result, 'missing-route');
        });

        it(`combines any additional parameter provided into the handler params object`, async () => {
            // arrange
            const additionalParams: ParamsType = {
                '--flag-a': 'flag-a-value',
                customParam: 'customValue',
                'some:weird:part': 'extra value',
            };
            const pathRouter = new PathRouter({
                defaultRouteHandler: async (handlerParam: HandlerParamsType) : Promise<void> => {
                    const params = handlerParam.params;

                    // assert
                    for (const paramName of Object.keys(additionalParams)) {
                        assert.equal(params[paramName], additionalParams[paramName]);
                    }
                },
            });
            pathRouter.addRoutes([
                {
                    name: 'route-withExtraParams',
                    path: 'route:{paramFromRoute}',
                },
                {
                    name: 'route-2',
                    path: 'second:route',
                },
            ]);

            // act / assert
            await pathRouter.executeRoute('route:route-value', additionalParams);
            await pathRouter.executeRoute('second:route', additionalParams);
        });
    });
});

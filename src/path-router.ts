import type { ParamsType, PathRouteConstructorObjectType } from './path-route';
import { PathRoute } from './path-route';
import type {
    HandlerParamsType,
    PathRouteHandlerType,
    PathRouteHandlerReturnType,
} from './path-route-default-handler';
import { isPathRouteHandlerFunction, isPathRouteHandlerExecutionResult } from './path-route-default-handler';

const defaultSeparator = ':';

type PathRouterConstructorObjectType = {
    defaultRouteHandler?: PathRouteHandlerType,
    defaultMissingRouteHandler?: PathRouteHandlerType,
    routeSeparator?: string,
};

type PathRouteMapConfiguration = PathRouteConstructorObjectType & {
    handler?: PathRouteHandlerType,
    redirectTo?: string,
}

type RouteItemType = {
    route: PathRoute,
    handler?: PathRouteHandlerType,
    redirectTo?: string,
}

type MatchRouteResultType = {
    routeConfig: RouteItemType,
    params: ParamsType,
}

export const PathRouterErrorCode = {
    unknown: 1,
    pathNotFound: 10,
    handlerNotFound: 20,
    handlerError: 30,
} as const;
export type PathRouterErrorCodeType = typeof PathRouterErrorCode[keyof typeof PathRouterErrorCode];

export class PathRouterError extends Error {
    code: PathRouterErrorCodeType;

    constructor(code: PathRouterErrorCodeType, message: string) {
        super(message);
        this.code = code;
    }
}


export class PathRouter {
    _routeSeparator: string;
    _routesMap: Readonly<Map<string, RouteItemType>> = new Map<string, RouteItemType>;
    _defaultRouteHandler?: PathRouteHandlerType;
    _defaultMisingRouteHandler?: PathRouteHandlerType;

    constructor({defaultRouteHandler, defaultMissingRouteHandler, routeSeparator = defaultSeparator}: Partial<PathRouterConstructorObjectType> = {}) {
        this._routeSeparator = routeSeparator;
        this._defaultRouteHandler = defaultRouteHandler;
        this._defaultMisingRouteHandler = defaultMissingRouteHandler;
    }

    addRoute(routeConfig: PathRouteMapConfiguration) {
        if (this._routesMap.has(routeConfig.name)) {
            throw new Error(`${routeConfig.name} is already defined as a route`);
        }

        const route = new PathRoute({ ...routeConfig, separator: this._routeSeparator });
        if (!routeConfig.hasOwnProperty('executor') && !this._defaultRouteHandler) {
            throw new Error(`Route requires a 'handler' when router doesn't have a default handler`)
        }

        const routeItem: RouteItemType = {
            route,
            handler: routeConfig.handler,
            redirectTo: routeConfig.redirectTo,
        };
        this._routesMap.set(route.name, routeItem);

        return this;
    }

    addRoutes(routesConfig: Array<PathRouteMapConfiguration>) {
        for (const routeConfig of routesConfig) {
            this.addRoute(routeConfig);
        }

        return this;
    }

    findMatch(givenPath: string): MatchRouteResultType | null {
        for (const [_, config] of this._routesMap) {
            const result = config.route.match(givenPath);
            if (result !== null) return {
                routeConfig: config,
                params: result,
            };
        }

        return null;
    }

    buildPath(path: string, params: ParamsType = {}) {
        const result = this.findMatch(path);

        return result?.routeConfig.route.buildPathByParams(params);
    }

    async executeRoute(givenString: string): PathRouteHandlerReturnType {
        const matchRouteResult = this.findMatch(givenString);
        if (matchRouteResult === null) {
            if (this._defaultMisingRouteHandler) {
                const params: any = {
                    path: givenString,
                    params: {},
                };
                return (isPathRouteHandlerFunction(this._defaultMisingRouteHandler))
                    ? this._defaultMisingRouteHandler(params)
                    : this._defaultMisingRouteHandler.execute(params);
            }
            throw new PathRouterError(
                PathRouterErrorCode.pathNotFound,
                `NotFound: ${givenString} doesn't match any route`,
            );
        }

        const routeConfig = matchRouteResult.routeConfig;
        if (routeConfig.redirectTo) {
            return this.executeRoute(routeConfig.redirectTo);
        }

        const params: HandlerParamsType = {
            path: givenString,
            params: matchRouteResult.params,
        };

        const handler = routeConfig.handler || this._defaultRouteHandler;
        if (!handler) {
            throw new PathRouterError(
                PathRouterErrorCode.handlerNotFound,
                `NoHandler: ${givenString} has no associated handler with it`,
            );
        }

        try {
            const result = (isPathRouteHandlerFunction(handler)) ? await handler(params) : await handler.execute(params);
            if (isPathRouteHandlerExecutionResult(result)) {
                if (result.redirectTo) return this.executeRoute(result.redirectTo);
            }

            return result;
        } catch (e) {
            throw new PathRouterError(
                PathRouterErrorCode.handlerError,
                (e instanceof Error) ? e.message : (e as any).toString()
            );
        }
    }
}

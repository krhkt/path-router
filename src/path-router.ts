import type { PathRouteConstructorObjectType } from './path-route';
import { PathRoute } from './path-route';
import { PathRouteHandler } from './path-route-handler';

const defaultSeparator = '/';

export class PathRouter {
    _routeSeparator: string;
    _routesMap: Readonly<Map<string, PathRoute>> = new Map<string, PathRoute>;
    _defaultRouteHandler?: PathRouteHandler;

    constructor(routes: Array<PathRouteConstructorObjectType>, routeSeparator:string = defaultSeparator) {
        this._routeSeparator = routeSeparator;
    }

    addRoute(routeConfig: PathRouteConstructorObjectType) {
        if (this._routesMap.has(routeConfig.name)) {
            throw new Error(`${routeConfig.name} is already defined as a route`);
        }

        const route = new PathRoute({ ...routeConfig, separator: this._routeSeparator });
        this._routesMap.set(route.name, route);

        return this;
    }

    addRoutes(routesConfig: Array<PathRouteConstructorObjectType>) {
        for (const routeConfig of routesConfig) {
            this.addRoute(routeConfig);
        }

        return this;
    }

    findMatch(givenPath: string) {
        for (const [name, route] of this._routesMap) {
            const result = route.match(givenPath);
            if (result !== null) return result;
        }

        return null;
    }

    executeRoute(givenString: string) {

    }
}

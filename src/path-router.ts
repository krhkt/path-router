
export class PathRouter {
  _routeSeparator = ':';
  _routesMap;

  constructor(routesMap: any, routeSeparator = '') {
    this._routesMap = routesMap;

    if (routeSeparator) this._routeSeparator = routeSeparator;
  }

  processRouteName(routeString: string) {
    const routeParts = routeString.split(this._routeSeparator);
  }
}
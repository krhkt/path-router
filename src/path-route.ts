import { PathRouteHandler} from "./path-route-handler";

const rgPartWithPlaceholder = /^(?<prefix>[^\{\}]*)[\{](?<identifier>[^\{\}]+)[\}](?<suffix>[^\{\}]*)$/;

type StringParsedPathPartType = {
    type: 'string',
    path: string,
};

type IdentifierParsedPathPartType = {
    type: 'identifier',
    prefix: string,
    identifier: string,
    suffix: string,
    regex?: RegExp,
};

export type ParsedPathPartType = StringParsedPathPartType | IdentifierParsedPathPartType;

export class PathRoute {
  separator: string;
  name: string;
  pathTemplate: string;
  defaults: object;
  constraints: object;
  parsedPathTemplate: Array<ParsedPathPartType> | undefined;
  //routeHandler: PathRouteHandler;

  constructor(
    name: string,
    path: string,
    separator: string,
    defaults: object | null = null,
    constraints: object | null = null,
  ) {
    this.name = name;
    this.pathTemplate = path;
    this.separator = separator;
    this.defaults = defaults || {};
    this.constraints = constraints || {};
  }

  processPathTemplate() {
    this.parsedPathTemplate = [];

    const templateParts = this.pathTemplate.split(this.separator);
    for (const part of templateParts) {
        const matches = rgPartWithPlaceholder.exec(part);
        const g = matches?.groups!;

        const parsedPathPart: ParsedPathPartType =
            (matches === null)
            ? { type: 'string', path: part }
            : {
                type: 'identifier',
                prefix: g.prefix,
                identifier: g.identifier,
                suffix: g.suffix,
            };

        this.parsedPathTemplate.push(parsedPathPart);
    }

    return this.parsedPathTemplate;
  }
}

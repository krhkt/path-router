import { PathRouteHandler} from "./path-route-handler";

// a path template placeholder can have it's identifer surrounded by a prefix and/or a suffix string
// valid placeholders parts examples:
//  {identifier}
//  prefix{identifier}
//  pf{identifer}suffix
const rgPartWithPlaceholder = /^(?<prefix>[^\{\}]*)[\{](?<identifier>[^\*\{\}]+)[\}](?<suffix>[^\{\}]*)$/;
// a greedy placeholder cannot be prefixed or suffixed by strings
// and has the following format: {*identifier}
const rgGreedyPlaceholder = /^\{\*(?<identifier>[^\}\{]+)\}$/;

export type StringParsedPathPartType = {
    type: 'string',
    path: string,
};

export type GreedyPlaceholderParsedPathPartType = {
    type: 'greedy',
    path: string,
    identifier: string,
};

export type ConstraintValidatorType = RegExp | ((input: string) => boolean);

export type PlaceholderParsedPathPartType = {
    type: 'placeholder',
    path: string,
    prefix: string,
    identifier: string,
    suffix: string,
    constraint?: ConstraintValidatorType,
};

export type ParsedPathPartType =
    StringParsedPathPartType
    | GreedyPlaceholderParsedPathPartType
    | PlaceholderParsedPathPartType;

export type ConstraintType = {
    [index: string]: ConstraintValidatorType
};

export type DefaultsType = {
    [index: string]: string,
};

export class PathRoute {
    separator: string;
    name: string;
    pathTemplate: string;
    defaults: DefaultsType;
    constraints: ConstraintType;
    parsedPathTemplate: Array<ParsedPathPartType> | undefined;
    //routeHandler: PathRouteHandler;

    constructor(
        name: string,
        path: string,
        separator: string,
        defaults: DefaultsType | null = null,
        constraints: ConstraintType | null = null,
    ) {
        this.name = name;
        this.pathTemplate = path;
        this.separator = separator;
        this.defaults = defaults || {};
        this.constraints = constraints || {}

        this.parsedPathTemplate = this.processPathTemplate();
        this.validateConstraintDefinitions(this.parsedPathTemplate, this.constraints);
    }

    processPathTemplate() {
        const parsedPaths = [];

        const templateParts = this.pathTemplate.split(this.separator);
        const lastIndex = templateParts.length - 1;
        for (let i = 0; i < templateParts.length; i += 1) {
            const part = templateParts[i];

            if (i === lastIndex) {
                const greedMatch = rgGreedyPlaceholder.exec(part);
                if (greedMatch !== null) {
                    parsedPaths.push({
                        type: 'greedy',
                        path: part,
                        identifier: greedMatch.groups!.identifier,
                    } as GreedyPlaceholderParsedPathPartType);
                    continue;
                }
            }
            const matches = rgPartWithPlaceholder.exec(part);
            const g = matches?.groups!;

            const parsedPathPart: ParsedPathPartType =
                (matches === null)
                ? { type: 'string', path: part }
                : {
                    type: 'placeholder',
                    path: part,
                    prefix: g.prefix,
                    identifier: g.identifier,
                    suffix: g.suffix,
                };

            parsedPaths.push(parsedPathPart);
        }

        return parsedPaths;
    }

    validateConstraintDefinitions(parsedPathTemplate: Array<ParsedPathPartType>, constraints: ConstraintType) {
        for (const constraintIdentifier of Object.keys(constraints)) {
            const existsInPaths = parsedPathTemplate.some((path) => {
                if (path.type === 'string') return false;

                return path.identifier === constraintIdentifier;
            });

            if (existsInPaths) continue;

            throw new Error(
                `"${constraintIdentifier}" doesn't exist as part of the route template path: "${this.pathTemplate}"`
            );
        }
    }
}

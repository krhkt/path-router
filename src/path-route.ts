// a path template placeholder can have it's identifer surrounded by a prefix and/or a suffix string
// valid placeholders parts examples:
//  {identifier}
//  prefix{identifier}
//  pf{identifer}suffix
const rgPartWithPlaceholder = /^(?<prefix>[^\{\}]*)[\{](?<identifier>[^\*\{\}]+)[\}](?<suffix>[^\{\}]*)$/;
// a greedy placeholder cannot be prefixed or suffixed by strings
// and has the following format: {*identifier}
const rgGreedyPlaceholder = /^\{\*(?<identifier>[^\}\{]+)\}$/;

type ConstraintValidatorType = RegExp | ((input: string) => boolean);

export type StringParsedPathPartType = {
    type: 'string',
    path: string,
};

export type GreedyPlaceholderParsedPathPartType = {
    type: 'greedy',
    path: string,
    identifier: string,
    constraint?: ConstraintValidatorType,
};

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

export const isStringPartType = (parsedPart: ParsedPathPartType): parsedPart is StringParsedPathPartType => parsedPart.type === 'string';
export const isPlaceholderPartType = (parsedPart: ParsedPathPartType): parsedPart is PlaceholderParsedPathPartType => parsedPart.type === 'placeholder';
export const isGreedyPartType = (parsedPart: ParsedPathPartType): parsedPart is GreedyPlaceholderParsedPathPartType => parsedPart.type === 'greedy';

export type ConstraintType = {
    [index: string]: ConstraintValidatorType
};

export type ParamsType = {
    [index: string]: string,
};

export type AdditionalParamsType = {
    [index: string | number]: any
}

export type PathRouteConstructorObjectType = {
    name: string,
    path: string,
    separator?: string,
    defaults?: ParamsType,
    constraints?: ConstraintType,
}

export class PathRoute {
    // shorthand contraints
    static NumericParam = /^\d+$/;
    static NumberParam = /^(?:-|\+)?\d+$/;
    static WordParam = /^\w+$/;
    static AlphaParam = /^[a-zA-Z]*$/;
    static AlphaNumericParam = /^[a-zA-Z0-9]+$/;
    static NonDigitParam = /^\D+$/;
    static OptionalParam = /.*/;

    // properties
    separator: Readonly<string>;
    name: Readonly<string>;
    pathTemplate: Readonly<string>;
    defaults: Readonly<ParamsType>;
    constraints: Readonly<ConstraintType>;
    parsedPathTemplate: Readonly<Array<ParsedPathPartType>>;

    constructor(
        { name, path, separator = '/', defaults = {}, constraints = {} }:
        PathRouteConstructorObjectType
    ) {
        this.name = name;
        this.pathTemplate = path;
        this.separator = separator;
        this.defaults = defaults;
        this.constraints = constraints;

        this.parsedPathTemplate = this.processPathTemplate();
        this._validateConstraintDefinitions(this.parsedPathTemplate, this.constraints);
        this._applyConstraintsToParsedTemplate();
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

    match(givenPath: string): ParamsType | null {
        const givenPathParts = givenPath.split(this.separator);
        const params: ParamsType = Object.assign({}, this.defaults);

        for (const parsedPart of this.parsedPathTemplate) {
            if (isStringPartType(parsedPart)) {
                if (givenPathParts.length === 0) return null;
                const givenPart = givenPathParts.shift()!;
                if (!this._matchString(givenPart, parsedPart)) return null;
                continue;
            }

            if (isPlaceholderPartType(parsedPart)) {
                const givenPart = (givenPathParts.shift() || '');

                const matchedValue = this._matchPlaceholder(givenPart, parsedPart);
                const paramValue = matchedValue !== null
                    ? matchedValue
                    : parsedPart.identifier in this.defaults
                        ? this.defaults[parsedPart.identifier]
                        : null;
                if (paramValue === null) return null;
                params[parsedPart.identifier] = paramValue;
                continue;
            }

            const tail = givenPathParts.join(this.separator);
            const paramValue = this._matchGreedy(tail, parsedPart);
            if (paramValue === null) return null;
            params[parsedPart.identifier] = paramValue;
            return params;
        }

        // if the array is not exhausted, that means that the path
        // is not a complete match
        return (!givenPathParts.length) ? params : null;
    }

    buildPathByParams(params: ParamsType = {}) {
        const path: Array<string> = [];
        const normalizedParams = Object.assign({}, this.defaults, params);

        for (const parsedPart of this.parsedPathTemplate) {
            if (isStringPartType(parsedPart)) {
                path.push(parsedPart.path);
                continue;
            }

            const { identifier, constraint } = parsedPart;
            if (!normalizedParams.hasOwnProperty(identifier)) return null;

            const value = normalizedParams[identifier];
            const defaultValue = this.defaults[identifier];
            if ((value !== defaultValue) && !this._applyConstraint(value, constraint)) return null;

            path.push(
                isPlaceholderPartType(parsedPart)
                ? this._buildPlacholderPartValue(value, parsedPart)
                : value
            );
        }

        return path.join(this.separator);
    }


    _validateConstraintDefinitions(parsedPathTemplate: Readonly<Array<ParsedPathPartType>>, constraints: ConstraintType) {
        for (const constraintIdentifier of Object.keys(constraints)) {
            const existsInPaths = parsedPathTemplate.some((path) => {
                if (isStringPartType(path)) return false;

                return path.identifier === constraintIdentifier;
            });

            if (existsInPaths) continue;

            throw new Error(
                `"${constraintIdentifier}" doesn't exist as part of the route template path: "${this.pathTemplate}"`
            );
        }
    }

    _applyConstraintsToParsedTemplate() {
        for (const parsedPart of this.parsedPathTemplate) {
            if (isStringPartType(parsedPart)) continue;
            if (!this.constraints.hasOwnProperty(parsedPart.identifier)) continue;

            parsedPart.constraint = this.constraints[parsedPart.identifier];
        }
    }

    _matchString(part: string, parsedPart: StringParsedPathPartType) {
        return part === parsedPart.path;
    }

    _matchPlaceholder(part: string, parsedPart: PlaceholderParsedPathPartType) {
        if (!part.startsWith(parsedPart.prefix)) return null;
        if (!part.endsWith(parsedPart.suffix)) return null;

        const identifierPart = part.substring(parsedPart.prefix.length, part.length - parsedPart.suffix.length);
        return this._applyConstraint(identifierPart, parsedPart.constraint) ? identifierPart : null;
    }

    _matchGreedy(part: string, parsedPart: GreedyPlaceholderParsedPathPartType) {
        return this._applyConstraint(part, parsedPart.constraint) ? part : null;
    }

    _applyConstraint(candidateValue: string, constraint: ConstraintValidatorType | undefined) {
        if (constraint === undefined) return !!candidateValue;

        if (typeof constraint === 'function') {
            return constraint(candidateValue);
        }

        return constraint.test(candidateValue);
    }

    _buildPlacholderPartValue(value: string, parsedPart: PlaceholderParsedPathPartType) {
        return `${parsedPart.prefix}${value}${parsedPart.suffix}`;
    }
}

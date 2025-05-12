import * as path from 'path';
import * as fs from 'fs';
import { HandlerParamsType, IPathRouteHandler, PathRouteHandlerExecutionResult } from '../path-router';

const PathExecutionErrorCodes = {
    BasePathInvalid: 1,
    ClassNameNotFound: 10,
    ModuleClassNotInstantiable: 11,
    MethodNotFound: 20,
    MethodNotExecutable: 21,
    ModulePathNotFound: 30,
} as const;

type PathExecutionErrorCodesType = typeof PathExecutionErrorCodes[keyof typeof PathExecutionErrorCodes];

class PathExecutionError extends Error {
    errorCode: PathExecutionErrorCodesType | null = null;

    constructor(errorCode: PathExecutionErrorCodesType, ...args: any) {
        super(...args)
        this.errorCode = errorCode;
    }
}

const osPathSeparator = path.sep;

export class PathRouteControllerHandler implements IPathRouteHandler {
    namespaceIdentifier = 'namespace';
    classNameIdentifier = 'controller';
    methodNameIdentifier = 'action';
    namespaceSeparator = '.';
    fileNameSuffixSeparator = '.';

    executorConstructorParam?: Array<any>;
    runnerConstructorDefaultParams?: any;
    baseFolderPath: Readonly<string>;
    _loadedModules: Map<string, any>;

    constructor(baseFolderPath: string, executorConstructorParam?: Array<any>) {
        this.baseFolderPath = baseFolderPath;
        this._loadedModules = new Map<string, any>();
        this.executorConstructorParam = executorConstructorParam;
    }

    async execute(methodParams: HandlerParamsType) {
        const { params } = methodParams;

        const classNameParam = params[this.classNameIdentifier];
        const className = this.convertParamToClassName(classNameParam);

        const possibleNamespace = this.namespaceIdentifier in params ? params[this.namespaceIdentifier] : '';
        const namespacePath = this.convertNamespaceToPath(possibleNamespace);

        const fileName = namespacePath + this.convertParamToFileName(classNameParam);

        const module = await this._loadFileModule(fileName);

        const executor = await this._instantiate(module, className, this.executorConstructorParam);

        const methodNameParam = params[this.methodNameIdentifier];
        const methodName = this.convertParamToMethodName(methodNameParam);

        return await this._executeMethod(executor, methodName, methodParams);
    }

    // method to be overwritten by child classes if the build fileName logic needs change
    convertNamespaceToPath(namespace: string) {
        namespace = namespace.trim();
        if (!namespace) return '';

        const path = namespace.replace(this.namespaceSeparator, osPathSeparator);
        return path + (path.endsWith(osPathSeparator) ? '' : osPathSeparator);
    }

    // method to be overwritten by child classes if the build fileName logic needs change
    convertParamToFileName(className: string) {
        return `${className.trim()}${this.fileNameSuffixSeparator}controller`.toLowerCase();
    }

    // method to be overwritten by child classes if the build className logic needs change
    convertParamToClassName(param: string) {
        param = param.trim();
        if (!param) return '';

        const className = `${param.charAt(0).toUpperCase()}${param.substring(1)}Controller`;
        return className;
    }

    // method to be overwritten by child class if the build methodName logic needs change
    convertParamToMethodName(param: string) {
        param = param.trim();
        if (!param) return param;

        const actionName = `${param.charAt(0).toLowerCase()}${param.substring(1)}`;
        return actionName;
    }

    async _instantiate(module: any, className: string, constructorParams: Array<any> | undefined = undefined) {
        const errorMessage = `Couldn't instantiate runner class`;

        const normalizedClassName = this._findPropertyCaseInsensitive(module, className);

        if (normalizedClassName === null) {
            throw new PathExecutionError(
                PathExecutionErrorCodes.ClassNameNotFound,
                `${errorMessage}: ${className} not found`,
            );
        }

        const targetClass = module[normalizedClassName];
        if (!this._isNewable(targetClass)) {
            throw new PathExecutionError(
                PathExecutionErrorCodes.ModuleClassNotInstantiable,
                `${errorMessage}: ${normalizedClassName} is not instantiable`,
            );
        }

        return (constructorParams)
            ? new targetClass(...constructorParams)
            : new targetClass();
    }

    async _executeMethod(instance: any, methodName: string, params: HandlerParamsType) {
        const errorMessage = `Couln't run method in intance (${instance.constructor.name})`;

        const normalizedMethodName = this._findPropertyCaseInsensitive(instance, methodName);
        if (normalizedMethodName === null) {
            throw new PathExecutionError(
                PathExecutionErrorCodes.MethodNotFound,
                `${errorMessage}: ${methodName} not found`,
            );
        }
        if (typeof instance[normalizedMethodName] !== 'function') {
            throw new PathExecutionError(
                PathExecutionErrorCodes.MethodNotExecutable,
                `${errorMessage}: ${methodName} is not a method (${typeof instance[normalizedMethodName]})`,
            );
        }

        return instance[normalizedMethodName](params) as Promise<PathRouteHandlerExecutionResult | string | null>;
    }


    _validateBaseFolderPath(baseFolderPath: string) {
        if (fs.existsSync(baseFolderPath)) return;

        throw new PathExecutionError(
            PathExecutionErrorCodes.BasePathInvalid,
            `base folder: "${baseFolderPath}" doesn't exist in the filesystem.`,
        );
    }

    async _loadFileModule(filename: string) {
        const modulePath = path.join(this.baseFolderPath, filename);
        if (this._loadedModules.has(modulePath)) return this._loadedModules.get(modulePath);

        try {
            const module = await import(modulePath);
            this._loadedModules.set(modulePath, module);
            return module;
        } catch (e) {
            throw new PathExecutionError(
                PathExecutionErrorCodes.ModulePathNotFound,
                `Couldn't load module ${modulePath}`
            );
        }
    }

    _isNewable(value: any) {
        return typeof value === 'function' && value.prototype;
    }

    _convertCamelCaseToDashed(value: string) {
        if (!value.trim()) return '';

        let convertedString = '';

        value = value[0].toLowerCase + value.slice(1);
        for (const char of value) {
            if (char >= 'A' && char <= 'Z') {
                convertedString += `-${char.toLowerCase()}`;
                continue;
            }

            convertedString += char;
        }

        return convertedString;
    }

    _findPropertyCaseInsensitive(target: object, propName: string) {
        propName = propName.toLowerCase();

        let current = target;
        while (current) {
            for (const objectProp of Object.getOwnPropertyNames(current)) {
                if (objectProp.toLowerCase() === propName) return objectProp;
            }

            current = Object.getPrototypeOf(current);
        }

        return null;
    }
}

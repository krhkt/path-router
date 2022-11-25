import * as path from 'path';
import * as fs from 'fs';
import { ParamsType } from './path-route';

export type HandlerParamsType = {
    path: string,
    params: ParamsType,
};

export type PathRouteHandlerExecutionResult = {
    pathToRedirect?: string,
    dataBag?: any,
};

export type PathRouteHandlerReturnType = Promise<PathRouteHandlerExecutionResult | string | null>;

export interface IPathRouteHandler {
    execute(methodParams: HandlerParamsType): PathRouteHandlerReturnType
}

export type PathRouteHandlerFunctionType = ((methodParams: HandlerParamsType) => PathRouteHandlerReturnType);
export type PathRouteHandlerType = IPathRouteHandler | PathRouteHandlerFunctionType;

export const isPathRouteHandlerFunction =
    (candidate: PathRouteHandlerType): candidate is PathRouteHandlerFunctionType => typeof candidate === 'function';


export class PathRouteDefaultHandler implements IPathRouteHandler {
    executorConstructorParam?: Array<any>;
    runnerConstructorDefaultParams?: any;
    classNameIdentifier = 'controller';
    methodNameIdentifier = 'action';
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

        const fileName = this.convertParamToFileName(className);
        const module = await this._loadFileModule(fileName);

        const executor = await this.instantiate(module, className, this.executorConstructorParam);

        const methodNameParam = params[this.methodNameIdentifier];
        const methodName = this.convertParamToMethodName(methodNameParam);

        return this._executeMethod(executor, methodName, methodParams);
    }

    // method to be overwritten by child classes if the build fileName logic needs change
    convertParamToFileName(classNameIdentifier: string) {
        return `${classNameIdentifier}.controller.js`.toLowerCase();
    }

    // method to be overwritten by child classes if the build className logic needs change
    convertParamToClassName(param: string) {
        param = param.trim();
        if (!param) return param;

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

    async instantiate(module: any, className: string, constructorParams: Array<any> | undefined = undefined) {
        const errorMessage = `Couldn't instantiate runner class`;

        const normalizedClassName = this._findPropertyCaseInsensitive(module, className);

        if (normalizedClassName === null) {
            throw new Error(`${errorMessage}: ${className} not found`);
        }

        const targetClass = module[normalizedClassName];
        if (!this._isNewable(targetClass)) {
            throw new Error(`${errorMessage}: ${normalizedClassName} is not instantiable`);
        }

        return (constructorParams)
            ? new targetClass(...constructorParams)
            : new targetClass();
    }

    async _executeMethod(instance: any, methodName: string, params: HandlerParamsType) {
        const errorMessage = `Couln't run method in intance (${instance.constructor.name})`;

        const normalizedMethodName = this._findPropertyCaseInsensitive(instance, methodName);
        if (normalizedMethodName === null) {
            throw new Error(`: ${methodName} not found`)
        }
        if (typeof instance[normalizedMethodName] !== 'function') {
            throw new Error(`: ${methodName} is not a method (${typeof instance[normalizedMethodName]})`);
        }

        return instance[normalizedMethodName](params) as Promise<PathRouteHandlerExecutionResult | string | null>;
    }


    _validateBaseFolderPath(baseFolderPath: string) {
        if (fs.existsSync(baseFolderPath)) return;

        throw new Error(`base folder: "${baseFolderPath}" doesn't exist in the filesystem.`);
    }

    async _loadFileModule(filename: string) {
        const modulePath = path.join(this.baseFolderPath, filename);
        if (this._loadedModules.has(modulePath)) return this._loadedModules.get(modulePath);

        const module = await import(modulePath);
        this._loadedModules.set(modulePath, module);
        return module;
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

        for (const objectProp of Object.keys(target)) {
            if (objectProp.toLowerCase() === propName) return objectProp;
        }

        return null;
    }
}

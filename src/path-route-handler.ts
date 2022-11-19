import * as path from 'path';
import * as fs from 'fs';
import { ParamsType } from './path-route';

export type HandlerParamsType = {
    path: string,
    params: ParamsType,
};

export class PathRouteHandler {
    baseRunnerClass?: any;
    runnerConstructorDefaultParams?: any;
    classNameIdentifier = 'controller';
    methodNameIdentifier = 'action';
    baseFolderPath: Readonly<string>;
    _loadedModules: Map<string, any>;

    constructor(baseFolderPath: string, baseRunnerClass: any = null) {
        this.baseFolderPath = baseFolderPath;
        this._loadedModules = new Map<string, any>();
        this.baseRunnerClass = baseRunnerClass;
    }

    async execute(path: string, params: ParamsType) {
        const methodParams: HandlerParamsType = { path, params };

        const classNameParam = params[this.classNameIdentifier];
        const methodNameParam = params[this.methodNameIdentifier];

        const className = this.convertParamToClassName(classNameParam);
        const methodname = this.convertParamToMethodName(methodNameParam);


    }

    convertParamToFileName(classNameIdentifier: string) {

    }

    convertParamToClassName(param: string) {
        param = param.trim();
        if (!param) return param;

        const className = `${param.charAt(0).toUpperCase()}${param.substring(1)}Controller`;
        return className;
    }

    convertParamToMethodName(param: string) {
        const actionName = `${param.charAt(0).toLowerCase()}${param.substring(1)}`;
        return actionName;
    }

    async instantiate(module: any, className: string, constructorParams: Array<any> | undefined = undefined) {
        const errorMessage = `Couldn't instantiate runner class`;

        if (!module.hasOwnProperty(className)) {
            throw new Error(`${errorMessage}: ${className} not found`);
        }

        const targetClass = module[className];
        if (!this._isNewable(targetClass)) {
            throw new Error(`${errorMessage}: ${className} is not instantiable`);
        }

        if (this.baseRunnerClass && !this.baseRunnerClass.isPrototypeOf(targetClass)) {
            throw new Error(`${errorMessage}: ${className} doesn't extend ${this.baseRunnerClass.name}`);
        }

        return (constructorParams)
            ? new targetClass(...constructorParams)
            : new targetClass();
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
}

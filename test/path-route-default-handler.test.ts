import * as assert from 'node:assert';
import { PathRouteDefaultHandler } from '../src/path-route-default-handler';
// import { DefaultController } from './default-handler-test-modules/default.controller';

/**
 * Even though the majority of the methods are 'private', I'm still testing a few private methods
 * just to increase my confidence in the solution. These tests can be deleted if necessary.
 */
describe('PathRouteDefaultHandler', () => {
    describe('_instantiate', () => {
        it('given an object and a class, will create a instance of the class if it exists in the object', async () => {
            // arrange
            const objModule = {
                TestClass: class {
                    name: string;
                    constructor({name = "test"}) {
                        this.name = name;
                    }
                },
            };
            const className = 'testClass';
            const nameValue = 'test name';
            const params = [{name: nameValue}];

            const defaultHandler = new PathRouteDefaultHandler('');

            // act
            const instance = await defaultHandler._instantiate(objModule, className, params);

            // assert
            assert.notEqual(instance, null);
            assert.equal(instance.constructor, objModule.TestClass);
            assert.equal(instance.name, nameValue);
        });

        it('throws if the class is not found', async () => {
            // arrange
            const objModule = {};
            const className = 'InexistentClass';
            const defaultHandler = new PathRouteDefaultHandler('');

            // act / assert
            assert.throws(() => {
                const instance = defaultHandler._instantiate(objModule, className);
                assert.fail('method should throw if class is not in the module');
            });
        });

        it(`throws if the "class" can't is not intantiable`, async () => {
            // arrange
            const objModule = {
                Instantiable: function (name = 'default') {
                    (this as any).name = name;
                },
                NonInstantiable: () => {
                    return {};
                },
            };
            const instantiablePropertyName = 'instantiable';
            const nontInstantiablePropertyName = 'noninstantiable';
            const params = ['test name'];
            const defaultHandler = new PathRouteDefaultHandler('');

            // act
            const instance = await defaultHandler._instantiate(objModule, instantiablePropertyName, params);

            // act / assert
            assert.notEqual(instance, null);
            assert.equal(instance.constructor, objModule.Instantiable);
            assert.equal(instance.name, params[0]);

            assert.throws(() => {
                const result = defaultHandler._instantiate(objModule, nontInstantiablePropertyName, params);
                assert.fail(`_instantiate should throw if the module property can't be instantiated`);
            });
        });
    });

    describe('_loadModule', () => {
        it('loads the module if the respective file exists', async () => {
            // arrange
            const basePath = `${__dirname}/default-handler-test-modules`;
            const defaultHandler = new PathRouteDefaultHandler(basePath);

            // act
            const result = await defaultHandler.execute({
                path: 'default/index',
                params: {
                    controller: 'default',
                    action: 'index'
                }
            });

            // assert
            assert.equal(result, 'success');
        });
    });

    describe('_findPropertyCaseInsensitive()', () => {
        it('finds the real existing property name', () => {
            // arrange
            const realPropA = 'propA';
            const realPropMethod = 'MethodOfObject';
            const dummyObject = {
                [realPropA]: 'value A',
                pROpB: 1,
                [realPropMethod]: function () {
                    return null;
                },
            };
            const propNameA = 'propa';
            const propMethod = 'methodofobject';
            const handler = new PathRouteDefaultHandler('');

            // act
            const retrievedPropA = handler._findPropertyCaseInsensitive(dummyObject, propNameA);
            const retrievedMethodName = handler._findPropertyCaseInsensitive(dummyObject, propMethod);

            // assert
            assert.equal(retrievedPropA, realPropA);
            assert.equal(retrievedMethodName, realPropMethod);
        });

        it('finds the first property, in declaration order, that matches the given name, when multiple properties are matches', () => {
            // arrange
            const realDupProp = 'duPProp';
            const dummyObject = {
                [realDupProp]: 'dup value 2',
                DupProp: 'dup value 1',
            };
            const propDupName = 'dupprop';
            const handler = new PathRouteDefaultHandler('');

            // act
            const retrievedDupProp = handler._findPropertyCaseInsensitive(dummyObject, propDupName);

            // assert
            assert.equal(retrievedDupProp, realDupProp);
        });

        it('returns null when no equivalent property is found', () => {
            // arrange
            const dummyObject = {
                someProp: 10,
            };
            const propToFind = "nonExistentProp";
            const handler = new PathRouteDefaultHandler('');

            // act
            const result = handler._findPropertyCaseInsensitive(dummyObject, propToFind);

            // assert
            assert.equal(result, null);
        });
    });

});

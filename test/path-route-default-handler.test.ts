import * as assert from 'node:assert';
import { PathRouteDefaultHandler } from '../src/path-route-default-handler';

describe('PathRouteDefaultHandler', () => {
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

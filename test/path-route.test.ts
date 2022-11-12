import * as assert from 'node:assert';
import { PathRoute } from '../src/path-route';

describe('PathRoute', () => {
    describe('processPathTemplate()', () => {
        it('process ', () => {
            // arrange
            const route = new PathRoute('main-route', '/test/sample', '/');

            // act
            const parsedResult = route.processPathTemplate();

            // assert
            assert.equal(parsedResult.length, 3);
        });
    });
});


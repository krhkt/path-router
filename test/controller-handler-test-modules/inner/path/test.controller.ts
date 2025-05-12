import type { HandlerParamsType } from '../../../../src/path-router';

export class TestController {
    async joinParams(handleParams: HandlerParamsType) {
        const { params } = handleParams;

        return Object.values(params).join(':');
    }
}

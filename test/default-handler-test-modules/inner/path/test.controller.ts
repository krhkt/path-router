import type { HandlerParamsType } from '../../../../src/path-route-default-handler';

export class TestController {
    async joinParams(handleParams: HandlerParamsType) {
        const { params } = handleParams;

        return Object.values(params).join(':');
    }
}

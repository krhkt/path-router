module.exports = {
    loader: 'ts-node/esm',
    package: './package.json',
    watch: false,
    extension: ['ts'],
    recursive: true,
    reporter: 'spec',
    spec: 'test/**/*.test.ts',

    // enables parallelization of tests
    parallel: false,

    // when to consider a test slow
    slow: 100,
    timeout: 1000,
};

import assert from 'assert';
import * as cluster from './cluster';
import * as project from './project';

const { RANCHER_API_KEY, RANCHER_SERVER_API } = process.env;

assert(RANCHER_API_KEY);
assert(RANCHER_SERVER_API);

export { cluster, project };

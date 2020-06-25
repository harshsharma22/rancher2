#!/usr/bin/env ts-node-script

import * as main from './index';
import assert from 'assert';

const [, , type, method, args = ''] = process.argv;
console.log('type, method, args-->>>', type, method, args);

assert(type);
assert(method);

async function init() {
  const argArr = args.split(',');
  // @ts-ignore
  const typeObj = main[type];
  console.log('tpyeobj--', typeObj);

  const result = await typeObj[method].apply(typeObj, argArr);
  console.log('Execution result', result);
}

init();

// customApps.deployNginxIngress('System:perftest1', 'nginx-ingress');

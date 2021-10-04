import assert from 'assert';
import sinon from 'sinon';

type AssertType = typeof assert;
type sinonType = typeof sinon;

declare global {
  const assert: AssertType;
  const sinon: sinonType;
}

process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

Object.assign(global, {
  assert,
  sinon,
});

afterEach(() => {
  sinon.restore();
});

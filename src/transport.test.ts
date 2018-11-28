import test, { afterEach, beforeEach } from 'ava';
import * as os from 'os';
import * as td from 'testdouble';
import { GelfTransport } from './transport';

const gelf = require('gelf-pro');

beforeEach(() => {
  // mock out the gelf-pro functions setConfig(…) and message(…)
  td.replace(gelf, 'setConfig');
  td.replace(gelf, 'message');

  td.when(
    gelf.message(td.matchers.isA(String), td.matchers.isA(Number), td.matchers.anything())
  ).thenCallback(null);
});

afterEach(() => {
  td.reset();
});

test.serial('gelf client is constructed using default options', t => {
  const transport = new GelfTransport();

  t.notThrows(() =>
    td.verify(
      gelf.setConfig(
        td.matchers.contains({
          fields: {
            host: os.hostname()
          },
          adapterName: 'udp',
          adapterOptions: {
            host: 'localhost',
            port: 12201,
            family: undefined,
            protocol: undefined
          }
        })
      )
    )
  );
});

test.serial('gelf client is constructed using custom options', t => {
  const transport = new GelfTransport({
    host: 'the graylog hostname',
    protocol: 'tcp',
    port: 42,
    ipVersion: 6,
    source: 'my hostname',
    appName: 'my app name',
    appVersion: 'my app version'
  });

  t.notThrows(() =>
    td.verify(
      gelf.setConfig(
        td.matchers.contains({
          fields: {
            host: 'my hostname',
            appName: 'my app name',
            appVersion: 'my app version'
          },
          adapterName: 'tcp',
          adapterOptions: {
            host: 'the graylog hostname',
            port: 42,
            family: 6,
            timeout: 4000
          }
        })
      )
    )
  );
});

test.serial('logs message only', async t => {
  const transport = new GelfTransport();
  await transport.log(0, 'the message');
  t.notThrows(() =>
    td.verify(gelf.message('the message', 0, undefined, td.matchers.isA(Function)))
  );
});

test.serial('logs message plus a single meta item', async t => {
  const transport = new GelfTransport();
  await transport.log(0, 'the message', { state: 'WA', capital: 'Olympia' });
  t.notThrows(() =>
    td.verify(
      gelf.message(
        'the message',
        0,
        { state: 'WA', capital: 'Olympia' },
        td.matchers.isA(Function)
      )
    )
  );
});

test.serial('logs a single meta item that is object-like', async t => {
  const transport = new GelfTransport();
  await transport.log(0, { foo: 'bar' });
  t.notThrows(() =>
    td.verify(
      gelf.message(td.matchers.isA(String), 0, { foo: 'bar' }, td.matchers.isA(Function))
    )
  );
});

test.serial('logs a single meta item that is not object-like', async t => {
  const transport = new GelfTransport();
  await transport.log(0, 3.14159);
  t.notThrows(() =>
    td.verify(
      gelf.message(
        td.matchers.isA(String),
        0,
        { meta: 3.14159 },
        td.matchers.isA(Function)
      )
    )
  );
});

test.serial('logs a message plus a single meta item that is not object-like', async t => {
  const transport = new GelfTransport();
  await transport.log(0, 'Hello world!', 3.14159);
  t.notThrows(() =>
    td.verify(
      gelf.message('Hello world!', 0, { meta: 3.14159 }, td.matchers.isA(Function))
    )
  );
});

test.serial('logs a message plus multiple meta items', async t => {
  const transport = new GelfTransport();
  await transport.log(0, 'Hello world!', { pi: 3.14159, cookie: 'chocolate chip' }, 42);
  t.notThrows(() =>
    td.verify(
      gelf.message(
        'Hello world!',
        0,
        [{ pi: 3.14159, cookie: 'chocolate chip' }, 42],
        td.matchers.isA(Function)
      )
    )
  );
});

test.serial('logs multiple meta items (no message)', async t => {
  const transport = new GelfTransport();
  await transport.log(0, { pi: 3.14159, cookie: 'chocolate chip' }, 42);
  t.notThrows(() =>
    td.verify(
      gelf.message(
        td.matchers.isA(String),
        0,
        [{ pi: 3.14159, cookie: 'chocolate chip' }, 42],
        td.matchers.isA(Function)
      )
    )
  );
});

test.serial('calls transform function and uses its results', async t => {
  const transform = td.func();
  td.when(transform(td.matchers.isA(String), td.matchers.anything())).thenReturn({
    message: 'the message',
    meta: 'the meta'
  });

  const transport = new GelfTransport({ transform: transform as any });
  await transport.log(0, 'hello', { foo: 'bar' });
  t.notThrows(() =>
    td.verify(gelf.message('the message', 0, 'the meta', td.matchers.isA(Function)))
  );
});

test.serial('exposes minimumSeverity', t => {
  const transport = new GelfTransport({ minimumSeverity: 77 });
  t.is(transport.minimumSeverity, 77);
});

test.serial('ignores empty logging', async t => {
  const transport = new GelfTransport();
  await transport.log(0);
  t.is(td.explain(gelf.message).callCount, 0);
});

test.serial('configures IPv6', t => {
  const transport = new GelfTransport({ ipVersion: 6 });
  t.notThrows(() =>
    td.verify(
      gelf.setConfig(
        td.matchers.contains({
          adapterOptions: {
            family: 6,
            protocol: 'udp6'
          }
        })
      )
    )
  );
});

test.serial('uses a CA certificate when in TLS mode', t => {
  const transport = new GelfTransport({
    protocol: 'tcp-tls',
    caCert: 'the CA certificate'
  });
  t.notThrows(() =>
    td.verify(
      gelf.setConfig(
        td.matchers.contains({
          adapterOptions: {
            ca: ['the CA certificate']
          }
        })
      )
    )
  );
});

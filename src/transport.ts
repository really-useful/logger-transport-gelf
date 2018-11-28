import { Level } from '@reallyuseful/logger';
import { cloneDeep, isObjectLike } from 'lodash';
import { isIPv6 } from 'net';
import * as os from 'os';
import { promisify } from 'util';
import { Options } from './options';

const gelf = require('gelf-pro');

const defaults: Options = {
  host: 'localhost',
  port: 12201,
  protocol: 'udp',
  tcpTimeout: 4000,
  env: process.env.NODE_ENV,
  source: os.hostname()
};

/** Log to GELF/Graylog. */
export class GelfTransport {
  private readonly client: any;
  private readonly options: Options;

  /** create a new GelfTransport */
  constructor(options?: Options) {
    this.options = Object.assign({}, defaults, options);

    // auto-configure for IPv6 if possible: family & protocol need to be set correctly
    const useIPv6 =
      this.options.ipVersion === 6 || (this.options.host && isIPv6(this.options.host));

    // timeout is only applicable to the tcp protocols
    const timeout =
      ((this.options.protocol === 'tcp' || this.options.protocol === 'tcp-tls') &&
        this.options.tcpTimeout) ||
      undefined;

    // ca is only applicable to tcp-tls
    const ca =
      (this.options.protocol === 'tcp-tls' &&
        this.options.caCert && [this.options.caCert]) ||
      undefined;

    const gelfConfig: any = {
      fields: {
        appName: this.options.appName,
        environment: this.options.env,
        host: this.options.source,
        appVersion: this.options.appVersion
      },
      adapterName: this.options.protocol,
      adapterOptions: {
        host: this.options.host,
        port: this.options.port,
        family: (useIPv6 && 6) || undefined,
        protocol: (useIPv6 && this.options.protocol === 'udp' && 'udp6') || undefined,
        timeout,
        ca
      }
    };

    this.client = cloneDeep(gelf);
    this.client.setConfig(gelfConfig);
  }

  /** tell the Logger to only send us messages with this severity level or higher */
  get minimumSeverity() {
    return this.options.minimumSeverity;
  }

  /** log to GELF/Graylog */
  async log(level: Level, ...details: any[]) {
    const send = promisify(this.client.message.bind(this.client));

    if (!details.length) {
      return;
    }

    let message: string;
    let meta: any = undefined;

    if (typeof details[0] === 'string') {
      message = details.shift();
    } else {
      message = `message from ${this.options.appName || 'GELF client'}`;
    }

    if (details.length === 1) {
      // a single metadata item
      if (isObjectLike(details[0])) {
        meta = details.shift();
      } else {
        meta = { meta: details.shift() };
      }
    } else if (details.length > 1) {
      // multiple metadata items
      meta = details;
    }

    if (this.options.transform) {
      ({ message, meta } = this.options.transform(message, meta));
    }

    await send(message, level, meta);
  }
}

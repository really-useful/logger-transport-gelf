import { Level } from '@reallyuseful/logger';

export interface Options {
  /** the GELF or Graylog host (default: localhost) */
  host?: string;

  /** TCP or UDP port number (default: 12201) */
  port?: number;

  /** whether to use UDP, TCP, or TCP with TLS encryption (default: udp) */
  protocol?: 'udp' | 'tcp' | 'tcp-tls';

  /** must be set if your GELF host is on IPv6 (default: 4) */
  ipVersion?: 4 | 6;

  /** if using a tcp protocol, the timeout in milliseconds (default: 4000 milliseconds) */
  tcpTimeout?: number;

  /**
   * if using tcp-tls and a self-signed certificate, the certificate of the CA that issued
   * the certificate, in PEM format
   */
  caCert?: string;

  /** your app’s hostname (default: os.hostname()) */
  source?: string;

  /** your app’s name, passed as the `appName` value to GELF */
  appName?: string;

  /** your app’s version number, passed as the `appVersion` value to GELF */
  appVersion?: string;

  /**
   * the environment (such as "development" or "production") in which your app is running
   * (default: the value of the NODE_ENV environment variable)
   */
  env?: string;

  /**
   * if specified, messages lower than this severity will not be logged to this transport
   */
  minimumSeverity?: Level;

  /** an optional function that can modify messages just before they are sent to GELF */
  transform?: (message: string, meta: any) => { message: string; meta: any };
}

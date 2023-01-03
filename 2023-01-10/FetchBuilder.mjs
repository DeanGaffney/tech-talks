import fetch from 'node-fetch';
import https from 'https';
import http from 'http';
import fetchRetry from 'fetch-retry';

const DEFAULTS = {
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY: 100,
  MIN_RETRY_DELAY_MS: 100,
  MAX_RETRY_DELAY_MS: 1000,
};

export default class FetchBuilder {
  constructor(logger) {
    this.timeout = 0;
    this.retriesEnabled = false;
    this.maxRetries = DEFAULTS.MAX_RETRIES;
    this.keepAlive = false;
    this.logger = logger;
  }

  withTimeout(timeoutMilliseconds) {
    this.timeout = timeoutMilliseconds;
    return this;
  }

  withRetries() {
    this.retriesEnabled = true;
    return this;
  }

  withMaxRetries(maxNumberOfRetries) {
    this.maxRetries = maxNumberOfRetries;
    return this;
  }

  withKeepAlive() {
    this.keepAlive = true;
    return this;
  }

  build() {
    // important to create the agents outside of the function
    // if they are recreated each time the function is invoked the connection will not be reused
    const httpsAgent = new https.Agent({ keepAlive: true });
    const httpAgent = new http.Agent({ keepAlive: true });

    return async (url, fetchOptions = {}) => {
      const options = { ...fetchOptions };

      if (this.timeout) {
        options.timeout = this.timeout;
      }

      if (this.keepAlive) {
        options.agent = url.startsWith('https:') ? httpsAgent : httpAgent;
      }

      if (!this.retriesEnabled) {
        return fetch(url, options);
      }

      const retryOptions = {
        retries: this.maxRetries,
        retryDelay: (retryAttempt) => {
          // https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
          const maxBackOff = Math.min(
            DEFAULTS.MAX_RETRY_DELAY_MS,
            DEFAULTS.BASE_RETRY_DELAY * 2 ** retryAttempt,
          );

          return Math.random()
            * (maxBackOff - DEFAULTS.MIN_RETRY_DELAY_MS)
            + DEFAULTS.MIN_RETRY_DELAY_MS;
        }
      };

      return fetchRetry(fetch)(url, { ...options, ...retryOptions });
    };
  }
};

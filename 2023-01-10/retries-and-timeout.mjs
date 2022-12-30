import FetchBuilder from './FetchBuilder.mjs';
import Benchmark from './Benchmark.mjs';
import logger from 'loglevel';

logger.setLevel(logger.levels.INFO);

const numOfRequests = 100;
const timeout = 2000;
const url = 'http://localhost:3000';

const fetch = new FetchBuilder(logger)
  .withRetries()
  .withTimeout(timeout)
  .build();

const benchmark = new Benchmark(logger, fetch, url, numOfRequests)

await benchmark.performBenchmark();

benchmark.outputResults();

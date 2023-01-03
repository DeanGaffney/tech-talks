import Server from './Server.mjs';
import CliTable from 'cli-table3';
import ServerStrategies from './ServerStrategies.mjs';

export default class Benchmark {
  constructor(logger, fetch, url, numOfRequests) {
    this.logger = logger;
    this.fetch = fetch;
    this.numOfRequests = numOfRequests;
    this.url = url;
    this.fetchResults = [];
    this.server = new Server(this.logger);
  }

  async performBenchmark() {
    await this.server.start();

    const requestIds = [];

    for (let i = 0; i < this.numOfRequests; i += 1) {
      requestIds.push(i);
    }

    this.fetchResults = await Promise.all(
      requestIds.map(async (id) => {
        try {
          const res = await this.fetch(`${this.url}?id=${id}`);
          return { json: await res.json(), id };
        } catch (error) {
          if (error.message.includes('network timeout')) {
            return { json: { strategy: ServerStrategies.TIMEOUT }, id }
          }
          return { json: { strategy: ServerStrategies.KILL_CONNECTION }, id }
        }
      }));

    this.server.stop();

    return this.fetchResults;
  }

  outputResults() {
    const overallTable = new CliTable({
      head: ['Total Requests', 'Total Requests w/ retries', 'Total Server Connections', '% Succeeded Overall', '% Failed Overall'],
    });

    const specificTable = new CliTable({
      head: ['% Handled', '% Killed', '% Timed Out']
    });

    const failedRequestsTable = new CliTable({
      head: ['Request Id', 'Attempts', 'Killed', 'Timed Out']
    })

    const successfulRequests = this.fetchResults.filter(res => res.json.strategy === ServerStrategies.SUCCEED)

    const failedResults = this.fetchResults.filter(res => res.json.strategy !== ServerStrategies.SUCCEED);

    const killedResults = this.fetchResults.filter(res => res.json.strategy === ServerStrategies.KILL_CONNECTION);
    const timeoutResults = this.fetchResults.filter(res => res.json.strategy === ServerStrategies.TIMEOUT);

    const percentageOfSuccessfulRequestsOverall = Math.floor(
      (successfulRequests.length / this.numOfRequests) * 100 / 1);

    const percentageOfFailedRequestsOverall = Math.floor(
      (failedResults.length / this.numOfRequests) * 100 / 1);

    const percentageOfKilledRequests = Math.floor(
      (killedResults.length / this.numOfRequests) * 100 / 1);

    const percentageOfTimedoutRequests = Math.floor(
      (timeoutResults.length / this.numOfRequests) * 100 / 1);

    overallTable.push([
      this.numOfRequests,
      this.server.getTotalRequestCount(),
      this.server.getConnectionCount(),
      percentageOfSuccessfulRequestsOverall,
      percentageOfFailedRequestsOverall,
    ]);

    specificTable.push([
      percentageOfSuccessfulRequestsOverall,
      percentageOfKilledRequests,
      percentageOfTimedoutRequests,
    ]);

    this.logger.info(overallTable.toString());
    this.logger.info(specificTable.toString());

    if (this.server.getFailedRequests().length > 0) {
      this.server.getFailedRequests().forEach(failedReq => {
        failedRequestsTable.push([
          failedReq['id'],
          failedReq['attempts'],
          failedReq['strategyHistory'].filter(strat => strat === ServerStrategies.KILL_CONNECTION).length,
          failedReq['strategyHistory'].filter(strat => strat === ServerStrategies.TIMEOUT).length
        ])
      });
      this.logger.debug(failedRequestsTable.toString());
    }

  }
}

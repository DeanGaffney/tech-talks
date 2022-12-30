import express from 'express';
import ServerStrategies from './ServerStrategies.mjs'

const app = express();
const port = 3000;

const strategies = [
  ServerStrategies.SUCCEED,
  ServerStrategies.KILL_CONNECTION,
  ServerStrategies.TIMEOUT
];

const TIMEOUT_MS = 5000;

export default class Server {
  constructor(logger) {
    this.logger = logger;
    this.requestHistory = {};
    this.connectionCount = 0;
  }

  pickRequestStrategy(requestId) {
    let weightedStrategyIndexes = {}

    const strategyIndexes = [];

    if (this.requestHistory[requestId]['attempts'] >= 3) {
      weightedStrategyIndexes = { 0: 0.8, 1: 0.1, 2: 0.1 };
    }

    if (this.requestHistory[requestId]['attempts'] === 2) {
      weightedStrategyIndexes = { 0: 0.7, 1: 0.15, 2: 0.15 };
    }

    if (this.requestHistory[requestId]['attempts'] === 1) {
      weightedStrategyIndexes = { 0: 0.5, 1: 0.25, 2: 0.25 };
    }

    Object.keys(weightedStrategyIndexes).forEach((index) => {
      for (let i = 0; i < weightedStrategyIndexes[index] * 10; i += 1) {
        strategyIndexes.push(Number.parseInt(index));
      }
    });

    const strategyIndex = strategyIndexes[Math.floor(Math.random() * strategyIndexes.length)]

    const selectedStrategy = strategies[strategyIndex];

    return selectedStrategy;
  }

  async start() {
    app.get('/', async (req, res) => {
      const { id } = req.query;

      if (!this.requestHistory[id]) {
        this.requestHistory[id] = { attempts: 0, strategyHistory: [] };
      }

      this.requestHistory[id]['attempts'] = this.requestHistory[id]['attempts'] + 1;

      const requestStrategy = this.pickRequestStrategy(id);

      this.requestHistory[id]['strategyHistory'].push(requestStrategy);

      this.logger.debug(`Handling request with id ${id} with strategy "${requestStrategy}"`);

      if (requestStrategy === ServerStrategies.SUCCEED) {
        res.status(200).send({ strategy: ServerStrategies.SUCCEED });
      }

      if (requestStrategy === ServerStrategies.KILL_CONNECTION) {
        res.socket.destroy();
      }

      if (requestStrategy === ServerStrategies.TIMEOUT) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, TIMEOUT_MS);
        });

        res.status(408).send({ strategy: ServerStrategies.TIMEOUT });
      }
    });

    await new Promise(resolve => {
      this.server = app.listen(port, () => {
        this.logger.debug(`App listening on port ${port}`);
        resolve();
      });

      this.server.on('connection', () => {
        this.connectionCount += 1;
      })
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }

  getFailedRequests() {
    return Object.keys(this.requestHistory)
      .filter(
        (requestId) => !this.requestHistory[requestId]['strategyHistory'].includes(ServerStrategies.SUCCEED)
      ).map(id => ({ id, ...this.requestHistory[id] }));
  }

  getTotalRequestCount() {
    const attempts = Object.keys(this.requestHistory).map(id => this.requestHistory[id]['attempts']);
    return attempts.reduce((x, y) => x + y, 0);
  }

  getConnectionCount() {
    return this.connectionCount;
  }
}

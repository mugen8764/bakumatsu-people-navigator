const { startStaticServer } = require('./static-server.cjs');

module.exports = async function globalSetup() {
  const runningServer = await startStaticServer();
  return async () => runningServer.close();
};

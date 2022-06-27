const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const FITzOnFitToken = artifacts.require('FITzOnFitToken');

module.exports = function (deployer, network) {
  return deployer.then(async () => {
    const token = await deployProxy(FITzOnFitToken, ['FITzOnFIT', 'FIT'], { deployer });
  });
}

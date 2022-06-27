const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const FITzOnFznToken = artifacts.require('FITzOnFznToken');

module.exports = function (deployer, network) {
  return deployer.then(async () => {
    const fw = await deployProxy(FITzOnFznToken, ['FITzOnFZN', 'FZN', 5000000000], { deployer });
  });
}

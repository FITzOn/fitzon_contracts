const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const FITzOnWearable = artifacts.require('FITzOnWearable');

module.exports = function (deployer) {
  return deployer.then(async () => {
    await deployProxy(FITzOnWearable, ['FITzOnWearable', 'ZNFT'], { deployer });
  });
}

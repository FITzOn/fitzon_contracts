const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const FITzOnWearable = artifacts.require('FITzOnWearable');

module.exports = function (deployer, network) {
  return deployer.then(async () => {
    if (network === 'development') {
      const ERC20ETHMock = artifacts.require('mocks/ERC20ETHMock');
      const mockToken = await deployer.deploy(ERC20ETHMock);
      console.log(`Deploy with mock ERC20 Eth address: ${mockToken.address}`);
      const fw = await deployProxy(FITzOnWearable, ['FITzOnWearable', 'ZNFT', mockToken.address], { deployer });
    } else {
      console.log(`Deploy with ERC20 Eth address: ${process.env.ERC20ETHAddress}`);
      const fw = await deployProxy(FITzOnWearable, ['FITzOnWearable', 'ZNFT', process.env.ERC20ETHAddress], { deployer });
    }
  });
}

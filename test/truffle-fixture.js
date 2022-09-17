const FITzOnWearable = artifacts.require('FITzOnWearable');
const FITzOnFitToken = artifacts.require('FITzOnFitToken');
const FITzOnFznToken = artifacts.require('FITzOnFznToken');

module.exports = async () => {
  const wearable = await FITzOnWearable.new();
  await wearable.initialize('FITzOnWearable', 'ZNFT');
  FITzOnWearable.setAsDeployed(wearable);

  const fit = await FITzOnFitToken.new();
  await fit.initialize('FITzOnFIT', 'FIT');
  FITzOnFitToken.setAsDeployed(fit);

  const fzn = await FITzOnFznToken.new();
  await fzn.initialize('FITzOnFZN', 'FZN', web3.utils.toWei('5000000000', 'ether'));
  FITzOnFznToken.setAsDeployed(fzn);
};

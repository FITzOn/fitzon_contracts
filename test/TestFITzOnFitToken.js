const { expectRevert } = require('@openzeppelin/test-helpers');

const token = artifacts.require('FITzOnFitToken');

contract('FITzOnFitToken', (accounts) => {
  const owner = accounts[0];
  const other1 = accounts[1];
  const other2 = accounts[2];
  const other3 = accounts[3];

  before(async () => {
    this.tokenInstance = await token.deployed();
  });

  it('Check initial state', async () => {
    assert.equal((await this.tokenInstance.name()).toString(), 'FITzOnFIT');
    assert.equal((await this.tokenInstance.symbol()).toString(), 'FIT');
  });

  it('Mint by owner', async () => {
    await this.tokenInstance.mint(other1, 100, { from: owner });
    assert.equal((await this.tokenInstance.balanceOf(other1)).toNumber(), 100, 'Balance should be 1 after mint');
    assert.equal((await this.tokenInstance.balanceOf(owner)).toNumber(), 0, 'Balance for owner should be 0');
    assert.equal((await this.tokenInstance.totalSupply()).toNumber(), 100, 'Total supply should be 1');
  });

  it('Set/Get name and symbol', async () => {
    await this.tokenInstance.setNameAndSymbol('FITzOnFIT2', 'FIT2');
    assert.equal((await this.tokenInstance.name()).toString(), 'FITzOnFIT2');
    assert.equal((await this.tokenInstance.symbol()).toString(), 'FIT2');

    await this.tokenInstance.setNameAndSymbol('FITzOnFIT', 'FIT');
    assert.equal((await this.tokenInstance.name()).toString(), 'FITzOnFIT');
    assert.equal((await this.tokenInstance.symbol()).toString(), 'FIT');
  });

  it('Pause/Unpause', async () => {
    await this.tokenInstance.mint(other2, 1, { from: owner });
    await this.tokenInstance.pause();
    await expectRevert(this.tokenInstance.mint(other2, 1, { from: owner }), 'ERC20Pausable: token transfer while paused');
    await this.tokenInstance.unpause();
    await this.tokenInstance.mint(other2, 1, { from: owner });
    assert.equal((await this.tokenInstance.balanceOf(other2)).toNumber(), 2, 'Balance should be 2 after mint');
  });

  it('Burn', async () => {
    await this.tokenInstance.mint(other3, 1, { from: owner });
    assert.equal((await this.tokenInstance.balanceOf(other3)).toNumber(), 1, 'Balance should be 1 after mint');
    await this.tokenInstance.burn(1, { from: other3 });
    assert.equal((await this.tokenInstance.balanceOf(other3)).toNumber(), 0, 'Balance should be 0 after burn');
  });

  it('Check owner', async () => {
    assert.equal(await this.tokenInstance.getOwner(), owner);
  });

  it('Try to call initilize', async () => {
    await expectRevert(this.tokenInstance.initialize('NA', 'NA'), 'Initializable: contract is already initialized');
  });

  it('Call owner only with other account', async () => {
    await expectRevert(this.tokenInstance.mint(other1, 1, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.tokenInstance.setNameAndSymbol('FFF', 'FFF', { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.tokenInstance.pause({ from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.tokenInstance.unpause({ from: other1 }), 'Ownable: caller is not the owner');
  });
});

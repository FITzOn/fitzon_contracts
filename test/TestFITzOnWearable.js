const { expectRevert } = require('@openzeppelin/test-helpers');
const ethers = require("ethers");

const mockToken = artifacts.require('ERC20ETHMock');
const wearable = artifacts.require('FITzOnWearable');

contract('FITzOnWearable', (accounts) => {
  const owner = accounts[0];
  const other1 = accounts[1];
  const other2 = accounts[2];
  const other3 = accounts[3];

  before(async () => {
    this.wearableInstance = await wearable.deployed();
    this.ethMockInstance = await mockToken.deployed();

    await this.ethMockInstance.mint(other1, web3.utils.toWei('1', 'ether'));
    assert.equal((await this.ethMockInstance.balanceOf(other1)).toString(), web3.utils.toWei('1', 'ether'), 'Should mint 1 eth');
    await this.ethMockInstance.mint(other2, web3.utils.toWei('1', 'ether'));
    assert.equal((await this.ethMockInstance.balanceOf(other2)).toString(), web3.utils.toWei('1', 'ether'), 'Should mint 1 eth');
  });

  it('Mint by owner', async () => {
    await this.wearableInstance.mint(other1, 1, { from: owner });
    assert.equal((await this.wearableInstance.balanceOf(other1)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.balanceOf(owner)).toNumber(), 0, 'Balance for owner should be 0');
    assert.equal((await this.wearableInstance.totalSupply()).toNumber(), 1, 'Total supply should be 1');
    assert.equal((await this.wearableInstance.tokenOfOwnerByIndex(other1, 0)).toNumber(), 1, 'Token id should be 1');
    assert.equal((await this.wearableInstance.tokenByIndex(0)).toNumber(), 1, 'Token id should be 1');
  });

  it('Revealed', async () => {
    await this.wearableInstance.setBaseURI('https://wearables/', { from: owner });
    await this.wearableInstance.setMysteryBoxURI('https://mystrybox', { from: owner });

    await this.wearableInstance.mint(other1, 2, { from: owner });
    let url = await this.wearableInstance.tokenURI(1);
    assert.equal(url, 'https://mystrybox', 'URI should be mystry box');

    // reveal
    await this.wearableInstance.setRevealed(true, { from: owner });
    url = await this.wearableInstance.tokenURI(1);
    assert.equal(url, 'https://wearables/1', 'URI should point to wearable');
  });

  it('Whitelist public mint', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address', 'uint256'], [other1, '10']);
    const hash2 = ethers.utils.solidityKeccak256(['address', 'uint256'], [other2, '11']);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setPublicMint(true);
    await this.wearableInstance.setPublicMintPrice(web3.utils.toWei('0.02', 'ether'));
    await this.wearableInstance.setMerkleRoot(root_hash);

    // approve contract to get token
    await this.ethMockInstance.approve(this.wearableInstance.address, web3.utils.toWei('0.02', 'ether'), {from: other2});

    await this.wearableInstance.whiteListMint(other2, 11, [hash1], { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
  });

  it('Whitelist but public mint is not started', async () => {
    const hash1 = ethers.utils.solidityKeccak256(['address', 'uint256'], [other1, '10']);
    await this.wearableInstance.setPublicMint(false);
    await expectRevert(this.wearableInstance.whiteListMint(other2, 11, [hash1], { from: other2 }), 'Public minting is not started yet');
  });

  it('Whitelist mint without ETH approve', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address', 'uint256'], [other1, '10']);
    const hash2 = ethers.utils.solidityKeccak256(['address', 'uint256'], [other3, '11']);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setPublicMint(true);
    await this.wearableInstance.setPublicMintPrice(web3.utils.toWei('0.02', 'ether'));
    await this.wearableInstance.setMerkleRoot(root_hash);

    await expectRevert(this.wearableInstance.whiteListMint(other3, 11, [hash1], { from: other3 }), 'Allowance must larger than price');
  });

  it('Whitelist mint with bad merkle proof', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address', 'uint256'], [other1, '10']);
    const hash2 = ethers.utils.solidityKeccak256(['address', 'uint256'], [other2, '11']);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setPublicMint(true);
    await this.wearableInstance.setPublicMintPrice(web3.utils.toWei('0.02', 'ether'));
    await this.wearableInstance.setMerkleRoot(root_hash);

    // approve contract to get token
    await this.ethMockInstance.approve(this.wearableInstance.address, web3.utils.toWei('0.02', 'ether'), {from: other2});

    await expectRevert(this.wearableInstance.whiteListMint(other2, 111, [hash1], { from: other2 }), 'Invalid merkle proof');
  });

  it('Set/Get default royalty', async () => {
    await this.wearableInstance.mint(other1, 31, { from: owner });
    await this.wearableInstance.setDefaultRoyalty(other3, 1000);
    let royaltyInfo = await this.wearableInstance.royaltyInfo(31, 50000);
    assert.equal(royaltyInfo[0], other3, `Royalty receiver should be ${other3}`);
    assert.equal(royaltyInfo[1].toNumber(), 5000, 'Royalty amount should be 5000');
  });

  it('Set/Get special royalty', async () => {
    await this.wearableInstance.mint(other1, 32, { from: owner });
    await this.wearableInstance.setDefaultRoyalty(other3, 1000);
    await this.wearableInstance.setTokenRoyalty(32, other3, 2000);
    let royaltyInfo = await this.wearableInstance.royaltyInfo(32, 50000);
    assert.equal(royaltyInfo[0], other3, `Royalty receiver should be ${other3}`);
    assert.equal(royaltyInfo[1].toNumber(), 10000, 'Royalty amount should be 10000');
  });

  it('Call owner only with other account', async () => {
    await expectRevert(this.wearableInstance.mint(other1, 1, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setPublicMint(true, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setPublicMintPrice(web3.utils.toWei('0.02', 'ether'), { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setRevealed(true, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setMerkleRoot(web3.utils.keccak256('abcdefg'), { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setDefaultRoyalty(other3, 1000, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setTokenRoyalty(32, other3, 1000, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setBaseURI('https://baseuri', { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setMysteryBoxURI('https://mysterybox', { from: other1 }), 'Ownable: caller is not the owner');
  });
});

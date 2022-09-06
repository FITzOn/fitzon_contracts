const { expectRevert } = require('@openzeppelin/test-helpers');
const ethers = require("ethers");

const wearable = artifacts.require('FITzOnWearable');

contract('FITzOnWearable', (accounts) => {
  const owner = accounts[0];
  const other1 = accounts[1];
  const other2 = accounts[2];
  const other3 = accounts[3];
  const other4 = accounts[4];

  before(async () => {
    this.wearableInstance = await wearable.deployed();
    this.currentBlock = await web3.eth.getBlock('latest');
  });

  it('Check initial state', async () => {
    assert.equal((await this.wearableInstance.name()).toString(), 'FITzOnWearable');
    assert.equal((await this.wearableInstance.symbol()).toString(), 'ZNFT');

    assert.equal((await this.wearableInstance.merkleRoot()).toString(), '0x0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('Mint by owner', async () => {
    await this.wearableInstance.mint(other1, 1, { from: owner });
    assert.equal((await this.wearableInstance.balanceOf(other1)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.balanceOf(owner)).toNumber(), 0, 'Balance for owner should be 0');
    assert.equal((await this.wearableInstance.totalSupply()).toNumber(), 1, 'Total supply should be 1');
    assert.equal((await this.wearableInstance.tokenOfOwnerByIndex(other1, 0)).toNumber(), 1, 'Token id should be 1');
    assert.equal((await this.wearableInstance.tokenByIndex(0)).toNumber(), 1, 'Token id should be 1');
  });

  it('Dev mint supply and price', async () => {
    // before set config
    assert.equal((await this.wearableInstance.devMintConfig()).devStartTime.toNumber(), 0, 'Start time should be 0 before dev mint');
    assert.equal((await this.wearableInstance.devMintConfig()).devQuantity.toNumber(), 0, 'Supply should be 0 before dev mint');
    assert.equal((await this.wearableInstance.devMintConfig()).devPrice.toNumber(), 0, 'Price should be 0 before dev mint');

    await this.wearableInstance.setDevMintConfig(this.currentBlock.timestamp + 1000, 100, web3.utils.toWei('0.02', 'ether'));

    assert.equal((await this.wearableInstance.devMintConfig()).devStartTime.toNumber(), this.currentBlock.timestamp + 1000, 'Start time should not be 0 after set config');
    assert.equal((await this.wearableInstance.devMintConfig()).devQuantity.toNumber(), 100, 'Supply should be 100 after set config');
    assert.equal((await this.wearableInstance.devMintConfig()).devPrice.toString(), web3.utils.toWei('0.02', 'ether'), 'Price should be 0.02 after set config');
  });

  it('Dev mint', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(1000);
    await this.wearableInstance.setDevMintConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.02', 'ether'));

    await this.wearableInstance.devMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(1000)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(1000, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
  });

  it('Dev mint but not started', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(1000);
    await this.wearableInstance.setDevMintConfig(0, 100, web3.utils.toWei('0.02', 'ether'));

    await expectRevert(this.wearableInstance.devMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') }), 'Dev mint is not started');
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after mint failed');

    await this.wearableInstance.setDevMintConfig(this.currentBlock.timestamp + 10000, 100, web3.utils.toWei('0.02', 'ether'));

    await expectRevert(this.wearableInstance.devMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') }), 'Dev mint is not started');
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after mint failed');
  });

  it('Dev mint but over max supply', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    const currentSupply = (await this.wearableInstance.totalSupply()).toNumber();
    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(1000);
    await this.wearableInstance.setDevMintConfig(this.currentBlock.timestamp - 1000, currentSupply + 1, web3.utils.toWei('0.02', 'ether'));

    await this.wearableInstance.devMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') });

    await expectRevert(this.wearableInstance.devMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') }), 'Reached max supply');
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should still be 1 after mint failed');

    await this.wearableInstance.burn(1000, { from: other2 });
  });

  it('Dev mint but bad proof', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(1000);
    await this.wearableInstance.setDevMintConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.02', 'ether'));

    await expectRevert(this.wearableInstance.devMint(other2, 1, [hash2], { from: other2, value: web3.utils.toWei('0.02', 'ether') }), 'Invalid merkle proof');
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after mint failed');
  });

  it('Dev mint but over 2 NFTs', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(1000);
    await this.wearableInstance.setDevMintConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.02', 'ether'));

    await this.wearableInstance.devMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') });
    await this.wearableInstance.devMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 2, 'Balance should be 2 after mint');

    await expectRevert(this.wearableInstance.devMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') }), 'Can only mint max 2 NFTs');
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 2, 'Balance should still be 2 after mint failed');

    await this.wearableInstance.burn(1000, { from: other2 });
    await this.wearableInstance.burn(1001, { from: other2 });
  });

  it('Dev mint from other contract', async () => {
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);

    const tester = artifacts.require('PreSaleMintTester');
    const inst = await tester.new();
    await expectRevert(inst.devMint(other1, 1, [hash1]), 'The caller is another contract');
  });

  it('Presale supply and price', async () => {
    // before set config
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 0, 'Supply should be 0 before presale');
    assert.equal((await this.wearableInstance.preSalePrice()).toNumber(), 0, 'Price should be 0 before presale');

    // before earlybird
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp + 1000, 100, web3.utils.toWei('0.2', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 200, web3.utils.toWei('0.4', 'ether'),
                                                 this.currentBlock.timestamp + 3000, 300, web3.utils.toWei('0.6', 'ether'));
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 0, 'Supply should be 0 before earlybird');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.2', 'ether'), 'Price should be 0.2 ether before earlybird');


    // for earlybird
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.2', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 200, web3.utils.toWei('0.4', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 300, web3.utils.toWei('0.6', 'ether'));

    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 100, 'Supply should be 100 for earlybird');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.2', 'ether'), 'Price should be 0.2 ether for earlybird');

    // for private
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 2000, 100, web3.utils.toWei('0.2', 'ether'),
                                                 this.currentBlock.timestamp - 1000, 200, web3.utils.toWei('0.4', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 300, web3.utils.toWei('0.6', 'ether'));

    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 200, 'Supply should be 200 for private');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.4', 'ether'), 'Price should be 0.4 ether for private');

    // for community
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 3000, 100, web3.utils.toWei('0.2', 'ether'),
                                                 this.currentBlock.timestamp - 2000, 200, web3.utils.toWei('0.4', 'ether'),
                                                 this.currentBlock.timestamp - 1000, 300, web3.utils.toWei('0.6', 'ether'));

    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 300, 'Supply should be 300 for community');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.6', 'ether'), 'Price should be 0.6 ether for community');
  });

  it('Earlybird presale mint', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 200, web3.utils.toWei('0.04', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 300, web3.utils.toWei('0.06', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(11)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(11, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
  });

  it('Private presale mint', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(21);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 2000, 100, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp - 1000, 200, web3.utils.toWei('0.04', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 300, web3.utils.toWei('0.06', 'ether'));

    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') }), 'Not enough tokens');
    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.04', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(21)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(21, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
  });

  it('Community presale mint', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(31);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 3000, 100, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp - 2000, 200, web3.utils.toWei('0.04', 'ether'),
                                                 this.currentBlock.timestamp - 1000, 300, web3.utils.toWei('0.06', 'ether'));

    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.04', 'ether') }), 'Not enough tokens');
    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.06', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(31)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(31, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
  });

  it('Presale but public mint is not started', async () => {
    const hash1 = ethers.utils.solidityKeccak256(['address', 'uint256'], [other1, '10']);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp + 1000, 100, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 200, web3.utils.toWei('0.04', 'ether'),
                                                 this.currentBlock.timestamp + 3000, 300, web3.utils.toWei('0.06', 'ether'));
    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') }), 'Public mint is not started');
  });

  it('Presale but over supply', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    const currentSupply = (await this.wearableInstance.totalSupply()).toNumber();
    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(101);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 1000, currentSupply + 1, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 200, web3.utils.toWei('0.04', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 300, web3.utils.toWei('0.06', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(101)).toString(), other2, 'Token owner should be other2');
    assert.equal((await this.wearableInstance.totalSupply()).toNumber(), currentSupply + 1, 'Total supply should be ' + (currentSupply + 1));

    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.02', 'ether') }), 'Reached max supply');
  });

  it('Presale mint without native tokens', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other3]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 200, web3.utils.toWei('0.04', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 300, web3.utils.toWei('0.06', 'ether'));

    await expectRevert(this.wearableInstance.preSaleMint(other3, 1, [hash1], { from: other3 }), 'Not enough tokens');
  });

  it('Presale mint multiple without enough native tokens', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other3]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 200, web3.utils.toWei('0.04', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 300, web3.utils.toWei('0.06', 'ether'));

    await expectRevert(this.wearableInstance.preSaleMint(other3, 2, [hash1], { from: other3, value: web3.utils.toWei('0.0399', 'ether') }), 'Not enough tokens');
  });

  it('Presale mint with bad merkle proof', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    const hash3 = ethers.utils.solidityKeccak256(['address'], [other3]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(111);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 200, web3.utils.toWei('0.04', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 300, web3.utils.toWei('0.06', 'ether'));

    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash3], { from: other2, value: web3.utils.toWei('0.02', 'ether') }), 'Invalid merkle proof');
  });

  it('Presale public mint over 5 NFTs', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other3]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(51);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 200, web3.utils.toWei('0.04', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 300, web3.utils.toWei('0.06', 'ether'));

    await this.wearableInstance.preSaleMint(other3, 5, [hash1], { from: other3, value: web3.utils.toWei('0.1', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other3)).toNumber(), 5, 'Balance should be 5 after 5 mints');
    assert.equal((await this.wearableInstance.ownerOf(51)).toString(), other3, 'Token owner should be other3');
    assert.equal((await this.wearableInstance.ownerOf(52)).toString(), other3, 'Token owner should be other3');
    assert.equal((await this.wearableInstance.ownerOf(53)).toString(), other3, 'Token owner should be other3');
    assert.equal((await this.wearableInstance.ownerOf(54)).toString(), other3, 'Token owner should be other3');
    assert.equal((await this.wearableInstance.ownerOf(55)).toString(), other3, 'Token owner should be other3');

    await expectRevert(this.wearableInstance.preSaleMint(other3, 1, [hash1], { from: other3, value: web3.utils.toWei('0.02', 'ether') }), 'Can only mint max 5 NFTs');
  });

  it('Presale mint from other contract', async () => {
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);

    const tester = artifacts.require('PreSaleMintTester');
    const inst = await tester.new();
    await expectRevert(inst.preSaleMint(other1, 1, [hash1]), 'The caller is another contract');
  });

  it('Set/Get default royalty', async () => {
    await this.wearableInstance.mint(other1, 41, { from: owner });
    await this.wearableInstance.setDefaultRoyalty(other3, 1000);
    let royaltyInfo = await this.wearableInstance.royaltyInfo(41, 50000);
    assert.equal(royaltyInfo[0], other3, `Royalty receiver should be ${other3}`);
    assert.equal(royaltyInfo[1].toNumber(), 5000, 'Royalty amount should be 5000');
  });

  it('Set/Get special royalty', async () => {
    await this.wearableInstance.mint(other1, 42, { from: owner });
    await this.wearableInstance.setDefaultRoyalty(other3, 1000);
    await this.wearableInstance.setTokenRoyalty(42, other3, 2000);
    let royaltyInfo = await this.wearableInstance.royaltyInfo(42, 50000);
    assert.equal(royaltyInfo[0], other3, `Royalty receiver should be ${other3}`);
    assert.equal(royaltyInfo[1].toNumber(), 10000, 'Royalty amount should be 10000');
  });

  it('Withdraw', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other4]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(102);
    await this.wearableInstance.setPreSaleConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.01', 'ether'),
                                                 this.currentBlock.timestamp + 1000, 200, web3.utils.toWei('0.02', 'ether'),
                                                 this.currentBlock.timestamp + 2000, 300, web3.utils.toWei('0.03', 'ether'));
    await this.wearableInstance.preSaleMint(other4, 1, [hash1], { from: other4, value: web3.utils.toWei('0.02', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other4)).toNumber(), 1, 'Balance should be 1 after mint');

    let beforeBalance = await web3.eth.getBalance(owner);
    await this.wearableInstance.withdraw(web3.utils.toWei('0.01', 'ether'));
    let currentBalance = await web3.eth.getBalance(owner);
    let withdrawAmount = currentBalance - beforeBalance;
    assert.equal(withdrawAmount > 0, true);

    await this.wearableInstance.withdraw(web3.utils.toWei('0.01', 'ether'));
    currentBalance = await web3.eth.getBalance(owner);
    let withdrawAmount2 = currentBalance - beforeBalance;
    assert.equal(withdrawAmount2 > withdrawAmount, true);
  });

  it('Set name and symbol', async () => {
    await this.wearableInstance.setNameAndSymbol('FITzOnW', 'WNFT');

    assert.equal((await this.wearableInstance.name()).toString(), 'FITzOnW');
    assert.equal((await this.wearableInstance.symbol()).toString(), 'WNFT');
  });

  it('Call owner only with other account', async () => {
    await expectRevert(this.wearableInstance.mint(other1, 1, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setPreSaleTokenId(1, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setDevMintConfig(1, 1, 1, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setPreSaleConfig(1, 1, 1, 2, 2, 2, 3, 3, 3, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setMerkleRoot(web3.utils.keccak256('abcdefg'), { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setDefaultRoyalty(other3, 1000, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setTokenRoyalty(32, other3, 1000, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setBaseURI('https://baseuri', { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.withdraw(web3.utils.toWei('0.1', 'ether'), { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setNameAndSymbol('FITzOnW', 'WNFT', { from: other1 }), 'Ownable: caller is not the owner');
  });
});

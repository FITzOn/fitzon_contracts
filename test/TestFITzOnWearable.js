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

    assert.equal((await this.wearableInstance.devMintMerkleRoot()).toString(), '0x0000000000000000000000000000000000000000000000000000000000000000');
    assert.equal((await this.wearableInstance.fastPassMerkleRoot()).toString(), '0x0000000000000000000000000000000000000000000000000000000000000000');
    assert.equal((await this.wearableInstance.preSaleMerkleRoot()).toString(), '0x0000000000000000000000000000000000000000000000000000000000000000');
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
    assert.equal((await this.wearableInstance.devMintConfig()).startTime.toNumber(), 0, 'Start time should be 0 before dev mint');
    assert.equal((await this.wearableInstance.devMintConfig()).quantity.toNumber(), 0, 'Supply should be 0 before dev mint');
    assert.equal((await this.wearableInstance.devMintConfig()).price.toNumber(), 0, 'Price should be 0 before dev mint');

    await this.wearableInstance.setDevMintConfig(this.currentBlock.timestamp + 1000, 100, web3.utils.toWei('0.02', 'ether'));

    assert.equal((await this.wearableInstance.devMintConfig()).startTime.toNumber(), this.currentBlock.timestamp + 1000, 'Start time should not be 0 after set config');
    assert.equal((await this.wearableInstance.devMintConfig()).quantity.toNumber(), 100, 'Supply should be 100 after set config');
    assert.equal((await this.wearableInstance.devMintConfig()).price.toString(), web3.utils.toWei('0.02', 'ether'), 'Price should be 0.02 after set config');
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

    await this.wearableInstance.setDevMintMerkleRoot(root_hash);
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

    await this.wearableInstance.setDevMintMerkleRoot(root_hash);
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
    await this.wearableInstance.setDevMintMerkleRoot(root_hash);
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

    await this.wearableInstance.setDevMintMerkleRoot(root_hash);
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

    await this.wearableInstance.setDevMintMerkleRoot(root_hash);
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

  it('Dev mint but no enough token', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setDevMintMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(1000);
    await this.wearableInstance.setDevMintConfig(this.currentBlock.timestamp - 1000, 100, web3.utils.toWei('0.02', 'ether'));

    await expectRevert(this.wearableInstance.devMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.01', 'ether') }), 'Not enough tokens');
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after mint failed');
  });

  it('Dev mint from other contract', async () => {
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);

    const tester = artifacts.require('PreSaleMintTester');
    const inst = await tester.new();
    await expectRevert(inst.devMint(other1, 1, [hash1]), 'The caller is another contract');
  });

  it('Presale supply and price', async () => {
    const hash1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
    const hash2 = '0x0000000000000000000000000000000000000000000000000000000000000002';

    await this.wearableInstance.setFastPassMerkleRoot(hash1);
    await this.wearableInstance.setPreSaleMerkleRoot(hash2);

    // before set config
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 0, 'Supply should be 0 before presale');
    assert.equal((await this.wearableInstance.preSalePrice()).toNumber(), 0, 'Price should be 0 before presale');
    assert.equal((await this.wearableInstance.preSaleRoot()).toString(), '0x0000000000000000000000000000000000000000000000000000000000000000');

    // before earlybird
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp + 1500, 10,
                                                   this.currentBlock.timestamp + 2000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 2500, 110,
                                                   this.currentBlock.timestamp + 3000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 3500, 210,
                                                   this.currentBlock.timestamp + 4000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 0, 'Supply should be 0 before earlybird');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.2', 'ether'), 'Price should be 0.2 ether before earlybird');
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 0, 'Supply should be 0 before earlybird');
    assert.equal((await this.wearableInstance.preSaleRoot()).toString(), '0x0000000000000000000000000000000000000000000000000000000000000000');

    // for earlybird fast pass
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 100, 10,
                                                   this.currentBlock.timestamp + 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));

    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 10, 'Supply should be 10 for earlybird fast pass');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.2', 'ether'), 'Price should be 0.2 ether for earlybird');
    assert.equal((await this.wearableInstance.preSaleRoot()).toString(), hash1);

    // for earlybird
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));

    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 100, 'Supply should be 100 for earlybird');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.2', 'ether'), 'Price should be 0.2 ether for earlybird');
    assert.equal((await this.wearableInstance.preSaleRoot()).toString(), hash2);

    // for private fast pass
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp - 100, 110,
                                                   this.currentBlock.timestamp + 1000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));

    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 110, 'Supply should be 110 for private fast pass');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.4', 'ether'), 'Price should be 0.4 ether for private');
    assert.equal((await this.wearableInstance.preSaleRoot()).toString(), hash1);

    // for private
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp - 800, 110,
                                                   this.currentBlock.timestamp - 700, 200,
                                                   web3.utils.toWei('0.4', 'ether'));

    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 200, 'Supply should be 200 for private');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.4', 'ether'), 'Price should be 0.4 ether for private');
    assert.equal((await this.wearableInstance.preSaleRoot()).toString(), hash2);

    // for community fast pass
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp - 100, 210,
                                                   this.currentBlock.timestamp + 1000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 210, 'Supply should be 210 for community fast pass');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.6', 'ether'), 'Price should be 0.6 ether for community');
    assert.equal((await this.wearableInstance.preSaleRoot()).toString(), hash1);

    // for community
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp - 600, 210,
                                                   this.currentBlock.timestamp - 500, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 300, 'Supply should be 300 for community');
    assert.equal((await this.wearableInstance.preSalePrice()).toString(), web3.utils.toWei('0.6', 'ether'), 'Price should be 0.6 ether for community');
    assert.equal((await this.wearableInstance.preSaleRoot()).toString(), hash2);
  });

  it('Earlybird fast pass presale mint', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setFastPassMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1000, 10,
                                                   this.currentBlock.timestamp + 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.2', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(11)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(11, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 10, 'Supply should be 10 for earlybird fast pass');
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

    await this.wearableInstance.setFastPassMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.2', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(11)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(11, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 100, 'Supply should be 100 for earlybird');
  });

  it('Private fast pass presale mint', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setFastPassMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp - 900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.4', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(11)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(11, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 110, 'Supply should be 110 for private fast pass');
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

    await this.wearableInstance.setFastPassMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp - 900, 110,
                                                   this.currentBlock.timestamp - 800, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.4', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(11)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(11, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 200, 'Supply should be 200 for private');
  });

  it('Community fast pass presale mint', async () => {
    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other2]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setFastPassMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp - 900, 110,
                                                   this.currentBlock.timestamp - 800, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp - 700, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.6', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(11)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(11, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 210, 'Supply should be 210 for community fast pass');
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

    await this.wearableInstance.setFastPassMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp - 900, 110,
                                                   this.currentBlock.timestamp - 800, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp - 700, 210,
                                                   this.currentBlock.timestamp - 600, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.6', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(11)).toString(), other2, 'Token owner should be other2');
    await this.wearableInstance.burn(11, { from: other2 });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 0, 'Balance should be 0 after burn');
    assert.equal((await this.wearableInstance.preSaleSupply()).toNumber(), 300, 'Supply should be 300 for community');
  });

  it('Presale but public mint is not started', async () => {
    const hash1 = ethers.utils.solidityKeccak256(['address', 'uint256'], [other1, '10']);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp + 900, 10,
                                                   this.currentBlock.timestamp + 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));
    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.2', 'ether') }), 'Public mint is not started');
  });

  it('Presale fast pass but over supply', async () => {
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
    await this.wearableInstance.setFastPassMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleTokenId(101);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1000, currentSupply + 1,
                                                   this.currentBlock.timestamp + 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.2', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(101)).toString(), other2, 'Token owner should be other2');
    assert.equal((await this.wearableInstance.totalSupply()).toNumber(), currentSupply + 1, 'Total supply should be ' + (currentSupply + 1));

    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.2', 'ether') }), 'Reached max supply');
    await this.wearableInstance.burn(101, { from: other2 });
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
    await this.wearableInstance.setFastPassMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(101);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, currentSupply,
                                                   this.currentBlock.timestamp - 1000, currentSupply + 1,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.2', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other2)).toNumber(), 1, 'Balance should be 1 after mint');
    assert.equal((await this.wearableInstance.ownerOf(101)).toString(), other2, 'Token owner should be other2');
    assert.equal((await this.wearableInstance.totalSupply()).toNumber(), currentSupply + 1, 'Total supply should be ' + (currentSupply + 1));

    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash1], { from: other2, value: web3.utils.toWei('0.2', 'ether') }), 'Reached max supply');
    await this.wearableInstance.burn(101, { from: other2 });
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

    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

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

    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(11);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await expectRevert(this.wearableInstance.preSaleMint(other3, 2, [hash1], { from: other3, value: web3.utils.toWei('0.399', 'ether') }), 'Not enough tokens');
  });

  it('Presale fast pass mint with bad merkle proof', async () => {
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

    await this.wearableInstance.setFastPassMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(111);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1000, 10,
                                                   this.currentBlock.timestamp + 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash3], { from: other2, value: web3.utils.toWei('0.2', 'ether') }), 'Invalid merkle proof');
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

    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(111);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1000, 10,
                                                   this.currentBlock.timestamp + 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await expectRevert(this.wearableInstance.preSaleMint(other2, 1, [hash3], { from: other2, value: web3.utils.toWei('0.2', 'ether') }), 'Invalid merkle proof');
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

    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(51);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.2', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));

    await this.wearableInstance.preSaleMint(other3, 5, [hash1], { from: other3, value: web3.utils.toWei('1', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other3)).toNumber(), 5, 'Balance should be 5 after 5 mints');
    assert.equal((await this.wearableInstance.ownerOf(51)).toString(), other3, 'Token owner should be other3');
    assert.equal((await this.wearableInstance.ownerOf(52)).toString(), other3, 'Token owner should be other3');
    assert.equal((await this.wearableInstance.ownerOf(53)).toString(), other3, 'Token owner should be other3');
    assert.equal((await this.wearableInstance.ownerOf(54)).toString(), other3, 'Token owner should be other3');
    assert.equal((await this.wearableInstance.ownerOf(55)).toString(), other3, 'Token owner should be other3');

    await expectRevert(this.wearableInstance.preSaleMint(other3, 1, [hash1], { from: other3, value: web3.utils.toWei('0.2', 'ether') }), 'Can only mint max 5 NFTs');
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

    await this.wearableInstance.setFastPassMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(102);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.1', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));
    await this.wearableInstance.preSaleMint(other4, 1, [hash1], { from: other4, value: web3.utils.toWei('0.2', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other4)).toNumber(), 1, 'Balance should be 1 after mint');

    let beforeBalance = await web3.eth.getBalance(owner);
    await this.wearableInstance.withdraw(web3.utils.toWei('0.1', 'ether'));
    let currentBalance = await web3.eth.getBalance(owner);
    let withdrawAmount = currentBalance - beforeBalance;
    assert.equal(withdrawAmount > 0, true);

    await this.wearableInstance.withdraw(web3.utils.toWei('0.1', 'ether'));
    currentBalance = await web3.eth.getBalance(owner);
    let withdrawAmount2 = currentBalance - beforeBalance;
    assert.equal(withdrawAmount2 > withdrawAmount, true);

    await this.wearableInstance.burn(102, { from: other4 });
  });

  it('Withdraw but no enough tokens', async () => {
    await expectRevert(this.wearableInstance.withdraw(web3.utils.toWei('100', 'ether')), 'Failed to send native token');
  });

  it('Set name and symbol', async () => {
    await this.wearableInstance.setNameAndSymbol('FITzOnW', 'WNFT');

    assert.equal((await this.wearableInstance.name()).toString(), 'FITzOnW');
    assert.equal((await this.wearableInstance.symbol()).toString(), 'WNFT');
  });

  it('Set bad presale config', async () => {
    await expectRevert(this.wearableInstance.setPreSaleEBConfig(1, 10, 1, 20, 4), 'Bad start time');
    await expectRevert(this.wearableInstance.setPreSaleEBConfig(1, 10, 2, 10, 4), 'Bad quantity');

    await this.wearableInstance.setPreSaleEBConfig(1, 10, 2, 20, 4);

    await expectRevert(this.wearableInstance.setPreSalePVConfig(2, 30, 3, 40, 4), 'Start time should later than early bird');
    await expectRevert(this.wearableInstance.setPreSalePVConfig(3, 30, 3, 40, 4), 'Bad start time');
    await expectRevert(this.wearableInstance.setPreSalePVConfig(3, 30, 6, 30, 4), 'Bad quantity');

    await this.wearableInstance.setPreSalePVConfig(3, 30, 4, 40, 4);

    await expectRevert(this.wearableInstance.setPreSaleCMConfig(4, 50, 5, 60, 4), 'Start time should later than private');
    await expectRevert(this.wearableInstance.setPreSaleCMConfig(5, 50, 5, 60, 4), 'Bad start time');
    await expectRevert(this.wearableInstance.setPreSaleCMConfig(5, 50, 6, 50, 4), 'Bad quantity');

    await this.wearableInstance.setPreSalePVConfig(5, 50, 6, 60, 4);
  });

  it('Get token URI', async () => {
    await expectRevert(this.wearableInstance.tokenURI(1000), "ERC721Metadata: URI query for nonexistent token");

    // calc merkle hash
    const hash1 = ethers.utils.solidityKeccak256(['address'], [other1]);
    const hash2 = ethers.utils.solidityKeccak256(['address'], [other4]);
    let root_hash;
    if (hash1 <= hash2) {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash1, hash2]);
    } else {
      root_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [hash2, hash1]);
    }

    await this.wearableInstance.setFastPassMerkleRoot('0x0000000000000000000000000000000000000000000000000000000000000000');
    await this.wearableInstance.setPreSaleMerkleRoot(root_hash);
    await this.wearableInstance.setPreSaleTokenId(1000);
    await this.wearableInstance.setPreSaleEBConfig(this.currentBlock.timestamp - 1100, 10,
                                                   this.currentBlock.timestamp - 1000, 100,
                                                   web3.utils.toWei('0.1', 'ether'));
    await this.wearableInstance.setPreSalePVConfig(this.currentBlock.timestamp + 1900, 110,
                                                   this.currentBlock.timestamp + 2000, 200,
                                                   web3.utils.toWei('0.4', 'ether'));
    await this.wearableInstance.setPreSaleCMConfig(this.currentBlock.timestamp + 2900, 210,
                                                   this.currentBlock.timestamp + 3000, 300,
                                                   web3.utils.toWei('0.6', 'ether'));
    await this.wearableInstance.preSaleMint(other4, 1, [hash1], { from: other4, value: web3.utils.toWei('0.2', 'ether') });
    assert.equal((await this.wearableInstance.balanceOf(other4)).toNumber(), 1, 'Balance should be 1 after mint');

    assert.equal(await this.wearableInstance.tokenURI(1000), '');
    await this.wearableInstance.setBaseURI('https://baseuri/');
    assert.equal(await this.wearableInstance.tokenURI(1000), 'https://baseuri/1000');

    await this.wearableInstance.burn(1000, { from: other4 });
  });

  it('Check owner', async () => {
    assert.equal(await this.wearableInstance.owner(), owner);
  });

  it('Try to call initilize', async () => {
    await expectRevert(this.wearableInstance.initialize('NA', 'NA'), 'Initializable: contract is already initialized');
  });

  it('Check supported interface', async () => {
    // ERC721
    assert.equal(await this.wearableInstance.supportsInterface('0x80ac58cd'), true);
    // ERC721Metadata
    assert.equal(await this.wearableInstance.supportsInterface('0x5b5e139f'), true);
    // ERC721Enumerable
    assert.equal(await this.wearableInstance.supportsInterface('0x780e9d63'), true);
    // ERC2981
    assert.equal(await this.wearableInstance.supportsInterface('0x2a55205a'), true);

    // ERC721TokenReceiver
    assert.equal(await this.wearableInstance.supportsInterface('0x150b7a02'), false);
    // other interface id
    assert.equal(await this.wearableInstance.supportsInterface('0x01020304'), false);
  });

  it('Call owner only with other account', async () => {
    await expectRevert(this.wearableInstance.mint(other1, 1, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setPreSaleTokenId(1, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setDevMintConfig(1, 1, 1, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setPreSaleEBConfig(1, 1, 2, 2, 3, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setPreSalePVConfig(1, 1, 2, 2, 3, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setPreSaleCMConfig(1, 1, 2, 2, 3, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setDevMintMerkleRoot(web3.utils.keccak256('abcdefg'), { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setFastPassMerkleRoot(web3.utils.keccak256('abcdefg'), { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setPreSaleMerkleRoot(web3.utils.keccak256('abcdefg'), { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setDefaultRoyalty(other3, 1000, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setTokenRoyalty(32, other3, 1000, { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setBaseURI('https://baseuri', { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.withdraw(web3.utils.toWei('0.1', 'ether'), { from: other1 }), 'Ownable: caller is not the owner');
    await expectRevert(this.wearableInstance.setNameAndSymbol('FITzOnW', 'WNFT', { from: other1 }), 'Ownable: caller is not the owner');
  });
});

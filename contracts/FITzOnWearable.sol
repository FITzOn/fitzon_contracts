// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721RoyaltyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

contract FITzOnWearable is Initializable,
        OwnableUpgradeable,
        ERC721EnumerableUpgradeable,
        ERC721BurnableUpgradeable,
        ERC721RoyaltyUpgradeable {
    bytes32 public merkleRoot;
    uint256 private _preSaleTokenId;
    string private _name;
    string private _symbol;
    string private _baseTokenURI;

    struct DevMintConfig {
        uint32 devStartTime;
        uint16 devQuantity;
        uint64 devPrice;
    }

    struct PreSaleConfig {
        uint32 earlybirdStartTime;
        uint16 earlybirdQuantity;
        uint64 earlybirdPrice;
        uint32 privateStartTime;
        uint16 privateQuantity;
        uint64 privatePrice;
        uint32 communityStartTime;
        uint16 communityQuantity;
        uint64 communityPrice;
    }

    DevMintConfig public devMintConfig;
    PreSaleConfig public preSaleConfig;

    function initialize(string memory __name, string memory __symbol) public initializer {
        __Ownable_init();
        __ERC721_init(__name, __symbol);
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __ERC721Royalty_init();

        _name = __name;
        _symbol = __symbol;
    }

    function mint(address to, uint256 tokenId) external onlyOwner {
        _safeMint(to, tokenId);
    }

    function devMint(address to, uint256 quantity, bytes32[] calldata proof) external payable {
        require(tx.origin == msg.sender, "The caller is another contract");
        require(devMintConfig.devStartTime != 0, "Dev mint is not started");
        require(block.timestamp >= devMintConfig.devStartTime, "Dev mint is not started");
        require(totalSupply() + quantity <= devMintConfig.devQuantity, "Reached max supply");
        require(devMintConfig.devPrice * quantity <= msg.value, "Not enough tokens");
        require(balanceOf(to) + quantity <= 2, "Can only mint max 2 NFTs");
        require(_verify(_leaf(to), proof), "Invalid merkle proof");

        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(to, _preSaleTokenId);
            _preSaleTokenId ++;
        }
    }

    function preSaleMint(address to, uint256 quantity, bytes32[] calldata proof) external payable {
        require(tx.origin == msg.sender, "The caller is another contract");
        require(isPublicSaleStarted(), "Public mint is not started");
        require(totalSupply() + quantity <= preSaleSupply(), "Reached max supply");
        require(preSalePrice() * quantity <= msg.value, "Not enough tokens");
        require(balanceOf(to) + quantity <= 5, "Can only mint max 5 NFTs");
        require(_verify(_leaf(to), proof), "Invalid merkle proof");

        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(to, _preSaleTokenId);
            _preSaleTokenId ++;
        }
    }

    function isPublicSaleStarted() public view returns (bool) {
        uint256 startTime = uint256(preSaleConfig.earlybirdStartTime);
        return startTime != 0 && block.timestamp >= startTime;
    }

    function preSaleSupply() public view returns (uint16) {
        if (preSaleConfig.earlybirdStartTime == 0 ||
            block.timestamp < uint256(preSaleConfig.earlybirdStartTime)) {
            return 0;
        } else if (block.timestamp < uint256(preSaleConfig.privateStartTime)) {
            return preSaleConfig.earlybirdQuantity;
        } else if (block.timestamp < uint256(preSaleConfig.communityStartTime)) {
            return preSaleConfig.privateQuantity;
        } else {
            return preSaleConfig.communityQuantity;
        }
    }

    function preSalePrice() public view returns (uint64) {
        if (block.timestamp >= uint256(preSaleConfig.communityStartTime)) {
            return preSaleConfig.communityPrice;
        } else if (block.timestamp >= uint256(preSaleConfig.privateStartTime)) {
            return preSaleConfig.privatePrice;
        } else {
            return preSaleConfig.earlybirdPrice;
        }
    }

    function setDevMintConfig(
      uint32 devStartTime,
      uint16 devQuantity,
      uint64 devPrice
    ) external onlyOwner {
        devMintConfig = DevMintConfig(
            devStartTime,
            devQuantity,
            devPrice
        );
    }

    function setPreSaleConfig(
      uint32 earlybirdStartTime,
      uint16 earlybirdQuantity,
      uint64 earlybirdPrice,
      uint32 privateStartTime,
      uint16 privateQuantity,
      uint64 privatePrice,
      uint32 communityStartTime,
      uint16 communityQuantity,
      uint64 communityPrice
    ) external onlyOwner {
        require(earlybirdStartTime <= privateStartTime && privateStartTime <= communityStartTime, "Bad start time");

        preSaleConfig = PreSaleConfig(
            earlybirdStartTime,
            earlybirdQuantity,
            earlybirdPrice,
            privateStartTime,
            privateQuantity,
            privatePrice,
            communityStartTime,
            communityQuantity,
            communityPrice
        );
    }

    function setPreSaleTokenId(uint256 startTokenId) external onlyOwner {
        _preSaleTokenId = startTokenId;
    }

    function setMerkleRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
    }

    function _leaf(address account) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(account));
    }

    function _verify(bytes32 leaf, bytes32[] memory proof) private view returns (bool) {
        return MerkleProofUpgradeable.verify(proof, merkleRoot, leaf);
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function setBaseURI(string memory baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
    }

    function withdraw(uint256 amount) external onlyOwner {
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Failed to send native token");
    }

    function setNameAndSymbol(string memory __name, string memory __symbol) external onlyOwner {
        _name = __name;
        _symbol = __symbol;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return ERC721Upgradeable.tokenURI(tokenId);
    }

    function _burn(uint256 tokenId)
            internal virtual
            override(ERC721Upgradeable,
                     ERC721RoyaltyUpgradeable) {
        return super._burn(tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
            internal virtual
            override(ERC721Upgradeable,
                     ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
            public view virtual
            override(ERC721Upgradeable,
                     ERC721EnumerableUpgradeable,
                     ERC721RoyaltyUpgradeable)
            returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

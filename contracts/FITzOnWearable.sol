// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721RoyaltyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

contract FITzOnWearable is Initializable,
        OwnableUpgradeable,
        ERC721EnumerableUpgradeable,
        ERC721BurnableUpgradeable,
        ERC721RoyaltyUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public ethToken;
    bool public revealed;
    bool public publicMint;
    bytes32 public merkleRoot;
    uint256 public publicMintPrice;
    string private _name;
    string private _symbol;
    string private _baseTokenURI;
    string private _mysteryBoxURI;

    function initialize(string memory __name, string memory __symbol, IERC20Upgradeable __token) public initializer {
        __Ownable_init();
        __ERC721_init(__name, __symbol);
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __ERC721Royalty_init();

        _name = __name;
        _symbol = __symbol;
        ethToken = __token;
    }

    function mint(address to, uint256 tokenId) external onlyOwner {
        _safeMint(to, tokenId);
    }

    function whiteListMint(address to, uint256 tokenId, bytes32[] calldata proof) external {
        require(publicMint == true, "Public minting is not started yet");
        require(ethToken.allowance(msg.sender, address(this)) >= publicMintPrice, "Allowance must larger than price");
        require(_verify(_leaf(to, tokenId), proof), "Invalid merkle proof");
        ethToken.safeTransferFrom(msg.sender, address(this), publicMintPrice);
        _safeMint(to, tokenId);
    }

    function setPublicMint(bool _state) external onlyOwner {
        publicMint = _state;
    }

    function setPublicMintPrice(uint256 price) external onlyOwner {
        publicMintPrice = price;
    }

    function setRevealed(bool _state) external onlyOwner {
        revealed = _state;
    }

    function setMerkleRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
    }

    function _leaf(address account, uint256 tokenId) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, tokenId));
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

    function setMysteryBoxURI(string memory mysteryBoxURI) external onlyOwner {
        _mysteryBoxURI = mysteryBoxURI;
    }

    function withdrawEth(address receiver, uint256 amount) external onlyOwner {
        ethToken.safeTransfer(receiver, amount);
    }

    function setERC20EthAddress(IERC20Upgradeable token) external onlyOwner {
        ethToken = token;
    }

    // Size of contract is over limit with this function,
    // when we need to change the name or symbal, try to remove some functions and then enable this one
    // function setNameAndSymbol(string memory __name, string memory __symbol) external onlyOwner {
    //     _name = __name;
    //     _symbol = __symbol;
    // }

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

        if (revealed == false) {
            return _mysteryBoxURI;
        }

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

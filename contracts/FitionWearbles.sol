// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721RoyaltyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

contract FitionWearbles is Initializable,
        AccessControlEnumerableUpgradeable,
        ERC721EnumerableUpgradeable,
        ERC721BurnableUpgradeable,
        ERC721PausableUpgradeable,
        ERC721RoyaltyUpgradeable {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string private _baseTokenURI;
    string private _mysteryBoxURI;
    bool private _revealed;
    bool private _publicMint;
    bytes32 private _merkleRoot;
  
    function initialize(string memory __name, string memory __symbol) public initializer {
        __AccessControlEnumerable_init();
        __ERC721_init(__name, __symbol);
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __ERC721Royalty_init();
        __ERC721Pausable_init();
  
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
    }
  
    function mint(address to, uint256 tokenId) external {
        require(hasRole(MINTER_ROLE, _msgSender()), "Must have minter role to mint");
        _safeMint(to, tokenId);
    }

    function whileListMint(address to, uint256 tokenId, bytes32[] calldata proof) external {
        require(_publicMint == true, "Public minting is not started yet");
        require(_verify(_leaf(to, tokenId), proof), "Invalid merkle proof");
        _safeMint(to, tokenId);
    }

    function setMerkleRoot(bytes32 root) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role to set merkle root");
        _merkleRoot = root;
    }

    function _leaf(address account, uint256 tokenId) private pure returns (bytes32)
    {
        return keccak256(abi.encodePacked(account, tokenId));
    }

    function _verify(bytes32 leaf, bytes32[] memory proof) private view returns (bool)
    {
        return MerkleProofUpgradeable.verify(proof, _merkleRoot, leaf);
    }
  
    function setRevealed(bool _state) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role to revealed flag");
        _revealed = _state;
    }
  
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
  
    function setBaseURI(string memory baseTokenURI) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role to set URI");
        _baseTokenURI = baseTokenURI;
    }
  
    function setMysteryBoxURI(string memory mysteryBoxURI) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role to set URI");
        _mysteryBoxURI = mysteryBoxURI;
    }
  
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
  
        if (_revealed == false) {
            return _mysteryBoxURI;
        }
  
        return ERC721Upgradeable.tokenURI(tokenId);
    }
  
    function pause() public virtual {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role to pause");
        _pause();
    }
  
    function unpause() public virtual {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role to unpause");
        _unpause();
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
                     ERC721EnumerableUpgradeable,
                     ERC721PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
  
    function supportsInterface(bytes4 interfaceId)
            public view virtual
            override(AccessControlEnumerableUpgradeable,
                     ERC721Upgradeable,
                     ERC721EnumerableUpgradeable,
                     ERC721RoyaltyUpgradeable)
            returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

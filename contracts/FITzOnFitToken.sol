// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract FITzOnFitToken is Initializable,
        OwnableUpgradeable,
        ERC20Upgradeable,
        ERC20BurnableUpgradeable,
        ERC20PausableUpgradeable {

    string private _name;
    string private _symbol;

    function initialize(string memory __name, string memory __symbol) public initializer {
        __Ownable_init();
        __ERC20_init(__name, __symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();

        _name = __name;
        _symbol = __symbol;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function setNameAndSymbol(string memory __name, string memory __symbol) external onlyOwner {
        _name = __name;
        _symbol = __symbol;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function getOwner() external view returns (address) {
        return owner();
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
            internal virtual
            override(ERC20Upgradeable,
                     ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20ETHMock is ERC20("ETHMock", "ETHM") {
    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}

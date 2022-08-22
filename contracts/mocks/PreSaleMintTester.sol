// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../FITzOnWearable.sol";

contract PreSaleMintTester {
    function preSaleMint(address to, uint256 quantity, bytes32[] calldata proof) external payable {
        FITzOnWearable inst = new FITzOnWearable();
        inst.preSaleMint(to, quantity, proof);
    }
}
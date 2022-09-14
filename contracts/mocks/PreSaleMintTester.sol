// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../FITzOnWearable.sol";

contract PreSaleMintTester {
    function devMint(address to, uint256 quantity, bytes32[] calldata proof) external payable {
        FITzOnWearable inst = new FITzOnWearable();
        inst.devMint(to, quantity, proof);
    }

    function preSaleMint(address to, uint256 quantity, bytes32[] calldata proof) external payable {
        FITzOnWearable inst = new FITzOnWearable();
        inst.preSaleMint(to, quantity, proof);
    }
}

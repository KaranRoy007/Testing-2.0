// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../bridges/L2_BaseBridge.sol";

contract Mock_L2_BaseBridge is L2_BaseBridge {
    uint256 private chainId;

    constructor (
        uint256 _chainId,
        iOVM_L2CrossDomainMessenger messenger,
        address l1Governance,
        HopBridgeToken hToken,
        address l1BridgeAddress,
        uint256[] memory activeChainIds,
        address[] memory bonders,
        uint32 defaultGasLimit
    )
        public
        L2_BaseBridge(
            messenger,
            l1Governance,
            hToken,
            l1BridgeAddress,
            activeChainIds,
            bonders,
            defaultGasLimit
        )
    {
        chainId = _chainId;
    }

    function getChainId() public override view returns (uint256) {
        return chainId;
    }
}

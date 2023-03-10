// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../interfaces/optimism/messengers/iOVM_L2CrossDomainMessenger.sol";
import "./L2_Bridge.sol";

/**
 * @dev An L2_Bridge for Base - https://docs.base.org/
 */

contract L2_BaseBridge is L2_Bridge {
    iOVM_L2CrossDomainMessenger public messenger;
    uint32 public defaultGasLimit;

    constructor (
        iOVM_L2CrossDomainMessenger _messenger,
        address l1Governance,
        HopBridgeToken hToken,
        address l1BridgeAddress,
        uint256[] memory activeChainIds,
        address[] memory bonders,
        uint32 _defaultGasLimit
    )
        public
        L2_Bridge(
            l1Governance,
            hToken,
            l1BridgeAddress,
            activeChainIds,
            bonders
        )
    {
        messenger = _messenger;
        defaultGasLimit = _defaultGasLimit;
    }

    function _sendCrossDomainMessage(bytes memory message) internal override {
        messenger.sendMessage(
            l1BridgeAddress,
            message,
            defaultGasLimit
        );
    }

    function _verifySender(address expectedSender) internal override {
        require(msg.sender == address(messenger), "L2_BASE_BRG: Caller is not the expected sender");
        // Verify that cross-domain sender is expectedSender
        require(messenger.xDomainMessageSender() == expectedSender, "L2_BASE_BRG: Invalid cross-domain sender");
    }

    /**
     * @dev Allows the L1 Bridge to set the messenger
     * @param _messenger The new messenger address
     */
    function setMessenger(iOVM_L2CrossDomainMessenger _messenger) external onlyGovernance {
        messenger = _messenger;
    }

    /**
     * @dev Allows the L1 Bridge to set the default gas limit
     * @param _defaultGasLimit The new default gas limit
     */
    function setDefaultGasLimit(uint32 _defaultGasLimit) external onlyGovernance {
        defaultGasLimit = _defaultGasLimit;
    }
}

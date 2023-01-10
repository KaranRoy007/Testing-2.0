// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../interfaces/consensysZkEvm/messengers/IBridge.sol";
import "./L2_Bridge.sol";

/**
 * @dev A MessengerWrapper for the ConsenSys zkEVM - https://consensys.net/docs/zk-evm/en/latest/
 */

contract L2_ConsensysZkEvmBridge is L2_Bridge {

    IBridge public consensysMessengerAddress;
    bytes32 public immutable l1ChainId;

    constructor (
        IBridge _consensysMessengerAddress,
        address l1Governance,
        HopBridgeToken hToken,
        address l1BridgeAddress,
        uint256[] memory activeChainIds,
        address[] memory bonders,
        uint256 _l1ChainId
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
        consensysMessengerAddress = _consensysMessengerAddress;
        l1ChainId = _l1ChainId;
    }

    function _sendCrossDomainMessage(bytes memory message) internal override {
        consensysMessengerAddress.dispatchMessage(
            l1BridgeAddress,
            0,
            9999999999, // Unlimited deadline
            message
        );
    }

    function _verifySender(address expectedSender) internal override {
        require(consensysL1BridgeAddress.sender() == l2BridgeAddress, "L2_CSYS_BRG: Invalid cross-domain sender");
        require(l1BridgeCaller == consensysL1BridgeAddress, "L2_CSYS_BRG: Caller is not the expected sender");
    }
}

// SPDX-License-Identifier: MIT
// @unsupported: ovm

pragma solidity 0.8.9;
pragma experimental ABIEncoderV2;

import "../polygon/ReentrancyGuard.sol";
import "../polygon/tunnel/FxBaseChildTunnel.sol";

contract L2Bridge {
    function commitTransfers(uint256 destinationChainId) external {}
}

contract L2_PolygonMessengerProxy is FxBaseChildTunnel, ReentrancyGuard {

    address public l2Bridge;
    address public xDomainMessageSender;
    bool private canCommit = false;

    address constant public DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    modifier onlyL2Bridge {
        require(msg.sender == l2Bridge, "L2_PLGN_MSG: Sender must be the L2 Bridge");
        _;
    }

    constructor(address _fxChild) public FxBaseChildTunnel(_fxChild) {
        xDomainMessageSender = DEAD_ADDRESS;
    }

    function setL2Bridge(address _l2Bridge) external {
        require(l2Bridge == address(0), "L2_PLGN_MSG: L2 Bridge already set");
        l2Bridge = _l2Bridge;
    }

    function commitTransfers(uint256 destinationChainId) external {
        require(msg.sender == tx.origin, "L2_PLGN_BRG_WRAP: Sender must be origin");
        canCommit = true;
        L2Bridge(l2Bridge).commitTransfers(destinationChainId);
        canCommit = false;
    }

    function sendCrossDomainMessage(bytes memory message) external onlyL2Bridge {
        require(canCommit, "L2_PLGN_MSG: Unable to commit");
        _sendMessageToRoot(message);
    }

    function _processMessageFromRoot(
        uint256 /* stateId */,
        address sender,
        bytes memory data
    )
        internal
        override
        validateSender(sender)
        nonReentrant
    {
        (address l1Sender, bytes memory message) = abi.decode(data, (address, bytes));
        xDomainMessageSender = l1Sender;
        (bool success,) = l2Bridge.call(message);
        require(success, "L2_PLGN_MSG: Failed to proxy message");
        xDomainMessageSender = DEAD_ADDRESS;
    }
}
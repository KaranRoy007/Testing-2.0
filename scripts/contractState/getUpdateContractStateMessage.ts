require('dotenv').config()
import { BigNumber, utils } from 'ethers'
import prompt from 'prompt'

import {
  getAddBonderMessage,
  getRemoveBonderMessage,
  getSetL1GovernanceMessage,
  getSetAmmWrapperMessage,
  getSetL1BridgeAddressMessage,
  getSetL1BridgeCallerMessage,
  getAddActiveChainIdsMessage,
  getRemoveActiveChainIdsMessage,
  getSetMinimumForceCommitDelayMessage,
  getSetMaxPendingTransfersMessage,
  getSetHopBridgeTokenOwnerMessage,
  getSetMinimumBonderFeeRequirementsMessage,
  getSetMessengerMessage,
  getSetDefaultGasLimitUint256Message,
  getSetDefaultGasLimitUint32Message,
  getSetMessengerProxyMessage
} from '../../test/shared/contractFunctionWrappers'

const FUNCTIONS = {
  ADD_BONDER: 'addBonder',
  REMOVE_BONDER: 'removeBonder',
  SET_L1_GOVERNANCE: 'setL1Governance',
  SET_AMM_WRAPPER: 'setAmmWrapper',
  SET_L1_BRIDGE_ADDRESS: 'setL1BridgeAddress',
  SET_L1_BRIDGE_CALLER: 'setL1BridgeCaller',
  ADD_ACTIVE_CHAIN_IDS: 'addActiveChainIds',
  REMOVE_ACTIVE_CHAIN_IDS: 'removeActiveChainIds',
  SET_MINIMUM_FORCE_COMMIT_DELAY: 'setMinimumForceCommitDelay',
  SET_MAX_PENDING_TRANSFERS: 'setMaxPendingTransfers',
  SET_HOP_BRIDGE_TOKEN_OWNER: 'setHopBridgeTokenOwner',
  SET_MINIMUM_BONDER_FEE_REQUIREMENTS: 'setMinimumBonderFeeRequirements',
  SET_MESSENGER: 'setMessenger',
  SET_DEFAULT_GAS_LIMIT_256: 'setDefaultGasLimit256',
  SET_DEFAULT_GAS_LIMIT_32: 'setDefaultGasLimit32',
  SET_MESSENGER_PROXY: 'setMessengerProxy'
}

export async function getUpdateContractStateMessage (functionToCall: string, input: any) {
  const messageToSend: string = getMessageToSend(functionToCall, input)
  return messageToSend
}

const getMessageToSend = (
  functionToCall: string,
  input: any
): string => {
  functionToCall = functionToCall.toLowerCase()
  switch(functionToCall) {
    case FUNCTIONS.ADD_BONDER.toLowerCase(): {
      return getAddBonderMessage(input)
    } 
    case FUNCTIONS.REMOVE_BONDER.toLowerCase(): {
      return getRemoveBonderMessage(input)
    } 
    case FUNCTIONS.SET_L1_GOVERNANCE.toLowerCase(): {
      return getSetL1GovernanceMessage(input)
    } 
    case FUNCTIONS.SET_AMM_WRAPPER.toLowerCase(): {
      return getSetAmmWrapperMessage(input)
    } 
    case FUNCTIONS.SET_L1_BRIDGE_ADDRESS.toLowerCase(): {
      return getSetL1BridgeAddressMessage(input)
    } 
    case FUNCTIONS.SET_L1_BRIDGE_CALLER.toLowerCase(): {
      return getSetL1BridgeCallerMessage(input)
    } 
    case FUNCTIONS.ADD_ACTIVE_CHAIN_IDS.toLowerCase(): {
      return getAddActiveChainIdsMessage([BigNumber.from(input)])
    } 
    case FUNCTIONS.REMOVE_ACTIVE_CHAIN_IDS.toLowerCase(): {
      return getRemoveActiveChainIdsMessage([BigNumber.from(input)])
    } 
    case FUNCTIONS.SET_MINIMUM_FORCE_COMMIT_DELAY.toLowerCase(): {
      return getSetMinimumForceCommitDelayMessage(input)
    } 
    case FUNCTIONS.SET_MAX_PENDING_TRANSFERS.toLowerCase(): {
      return getSetMaxPendingTransfersMessage(input)
    } 
    case FUNCTIONS.SET_HOP_BRIDGE_TOKEN_OWNER.toLowerCase(): {
      return getSetHopBridgeTokenOwnerMessage(input)
    } 
    case FUNCTIONS.SET_MINIMUM_BONDER_FEE_REQUIREMENTS.toLowerCase(): {
      throw new Error('This function requires two inputs. Please manually enter the second input.')
      const firstInput: BigNumber = BigNumber.from(input)
      const secondInput: BigNumber = BigNumber.from('0')
      return getSetMinimumBonderFeeRequirementsMessage(firstInput, secondInput)
    } 
    case FUNCTIONS.SET_MESSENGER.toLowerCase(): {
      return getSetMessengerMessage(input)
    } 
    case FUNCTIONS.SET_DEFAULT_GAS_LIMIT_256.toLowerCase(): {
      return getSetDefaultGasLimitUint256Message(input)
    } 
    case FUNCTIONS.SET_DEFAULT_GAS_LIMIT_32.toLowerCase(): {
      return getSetDefaultGasLimitUint32Message(input)
    } 
    case FUNCTIONS.SET_MESSENGER_PROXY.toLowerCase(): {
      return getSetMessengerProxyMessage(input)
    } 
    default: {
      throw new Error('Unknown function')
    }
  }
}

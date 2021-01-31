require('dotenv').config()

import {
  network,
  ethers,
  ethers as ovmEthers
} from 'hardhat'
import { BigNumber, ContractFactory, Signer, Contract } from 'ethers'

import { getContractFactories, sendChainSpecificBridgeDeposit } from '../shared/utils'

import { getMessengerWrapperDefaults } from '../../config/utils'
import { IGetMessengerWrapperDefaults } from '../../config/interfaces'
import { CHAIN_IDS, LIQUIDITY_PROVIDER_INITIAL_BALANCE, MAX_APPROVAL } from '../../config/constants'

// NOTE: Transactions sometimes get stuck during this script. Ensure that each transaction has been made.

async function setupL1 () {

  // Network setup
  const chainId: BigNumber = BigNumber.from(network.config.chainId)

  // Target L2
  const l2ChainId: BigNumber = BigNumber.from('0')
  if (l2ChainId.eq(0)) {
    throw new Error('Target L2 chain ID must be defined')
  }

  // Addresses
  const l1_messengerAddress: string = ''
  const l1_canonicalTokenAddress: string = ''
  const l1_bridgeAddress: string = ''
  const l2_bridgeAddress: string = ''

  if (!l1_messengerAddress || !l1_canonicalTokenAddress || !l1_bridgeAddress || !l2_bridgeAddress) {
    throw new Error('Addresses must be defined')
  }

  // Signers
  let accounts: Signer[]
  let bonder: Signer

  // Factories
  let MockERC20: ContractFactory
  let L1_Bridge: ContractFactory
  let MessengerWrapper: ContractFactory
  let L1_Messenger: ContractFactory
  let L2_Bridge: ContractFactory

  // Contracts
  let l1_canonicalToken: Contract
  let messengerWrapper: Contract
  let l1_bridge: Contract
  let l1_messenger: Contract
  let l2_bridge: Contract
  
  // Instantiate the wallets
  accounts = await ethers.getSigners()
  bonder = accounts[0]

  // Get the contract Factories
  ;({ 
    MockERC20,
    L1_Bridge,
    L1_Messenger,
    MessengerWrapper,
    L2_Bridge
  } = await getContractFactories(l2ChainId, bonder, ethers, ovmEthers))

  // Attach already deployed contracts
  l1_messenger = L1_Messenger.attach(l1_messengerAddress)
  l1_canonicalToken = MockERC20.attach(l1_canonicalTokenAddress)
  l1_bridge = L1_Bridge.attach(l1_bridgeAddress)
  l2_bridge = L2_Bridge.attach(l2_bridgeAddress)

  /**
   * Setup
   */

  // Deploy messenger wrapper
  const messengerWrapperDefaults: IGetMessengerWrapperDefaults[] = getMessengerWrapperDefaults(
    l2ChainId,
    l1_bridge.address,
    l2_bridge.address,
    l1_messenger.address
  )
  messengerWrapper = await MessengerWrapper.deploy(...messengerWrapperDefaults)
  await messengerWrapper.deployed()

  // Set up the L1 bridge
  await l1_bridge.setCrossDomainMessengerWrapper(l2ChainId, messengerWrapper.address)

  // Get canonical token to L2
  await l1_canonicalToken.mint(await bonder.getAddress(), LIQUIDITY_PROVIDER_INITIAL_BALANCE)
  await l1_canonicalToken.approve(l1_messenger.address, MAX_APPROVAL)
  await sendChainSpecificBridgeDeposit(
    chainId,
    bonder,
    LIQUIDITY_PROVIDER_INITIAL_BALANCE,
    l1_messenger,
    l1_canonicalToken
  )

  // Get hop token on L2
  await l1_canonicalToken.mint(await bonder.getAddress(), LIQUIDITY_PROVIDER_INITIAL_BALANCE)
  await l1_canonicalToken.approve(l1_bridge.address, LIQUIDITY_PROVIDER_INITIAL_BALANCE)
  await l1_bridge.sendToL2(l2ChainId, await bonder.getAddress(), LIQUIDITY_PROVIDER_INITIAL_BALANCE)
}

/* tslint:disable-next-line */
(async () => {
  await setupL1()
})()
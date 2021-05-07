import { ethers } from 'hardhat'
import {
  BigNumber,
  BigNumberish,
  Contract,
  Signer,
  utils as ethersUtils
} from 'ethers'
import { expect } from 'chai'
import { keccak256 } from 'ethers/lib/utils'
import { MerkleTree } from 'merkletreejs'
import {
  USER_INITIAL_BALANCE,
  LIQUIDITY_PROVIDER_INITIAL_BALANCE,
  LIQUIDITY_PROVIDER_AMM_AMOUNT,
  BONDER_INITIAL_BALANCE,
  INITIAL_BONDED_AMOUNT,
  DEFAULT_DEADLINE,
  CHALLENGER_INITIAL_BALANCE,
  RELAYER_INITIAL_BALANCE,
  DEFAULT_RELAYER_FEE,
  ZERO_ADDRESS,
  DEFAULT_ADMIN_ROLE_HASH
} from '../../config/constants'

import {
  executeCanonicalMessengerSendMessage,
  executeCanonicalBridgeSendTokens,
  executeL1BridgeSendToL2,
  getSetL1BridgeAddressMessage,
  getSetL1MessengerWrapperAddressMessage,
  getSetAmmWrapperAddressMessage
} from './contractFunctionWrappers'

import { IFixture } from './interfaces'

import {
  isChainIdOptimism,
  isChainIdArbitrum,
  isChainIdXDai,
  isChainIdPolygon,
  isChainIdMainnet,
  isChainIdGoerli,
  getPolygonCheckpointManagerAddress
} from '../../config/utils'

/**
 * Initialization functions
 */

export const setUpDefaults = async (fixture: IFixture) => {
  const l2ChainId: BigNumber = fixture.l2ChainId

  const setUpL1AndL2MessengersOpts = {
    l2ChainId
  }

  const setUpL1AndL2BridgesOpts = {
    messengerWrapperChainId: l2ChainId
  }

  const distributeCanonicalTokensOpts = {
    userInitialBalance: USER_INITIAL_BALANCE,
    liquidityProviderInitialBalance: LIQUIDITY_PROVIDER_INITIAL_BALANCE,
    bonderInitialBalance: BONDER_INITIAL_BALANCE,
    challengerInitialBalance: CHALLENGER_INITIAL_BALANCE,
    relayerInitialBalance: RELAYER_INITIAL_BALANCE
  }

  const setUpBonderStakeOpts = {
    l2ChainId: l2ChainId,
    bondAmount: INITIAL_BONDED_AMOUNT,
    amountOutMin: BigNumber.from('0'),
    deadline: BigNumber.from('0'),
    relayerFee: DEFAULT_RELAYER_FEE
  }

  const setUpL2AmmMarketOpts = {
    l2ChainId: l2ChainId,
    liquidityProviderBalance: LIQUIDITY_PROVIDER_AMM_AMOUNT,
    amountOutMin: BigNumber.from('0'),
    deadline: BigNumber.from('0'),
    relayerFee: DEFAULT_RELAYER_FEE
  }

  await setUpL2HopBridgeToken(fixture)
  await setUpL1AndL2Messengers(fixture, setUpL1AndL2MessengersOpts)
  await setUpL1AndL2Bridges(fixture, setUpL1AndL2BridgesOpts)
  await setUpL1AndL2Bridges(fixture, setUpL1AndL2BridgesOpts)
  await distributeCanonicalTokens(fixture, distributeCanonicalTokensOpts)
  await setUpBonderStake(fixture, setUpBonderStakeOpts)
  await setUpL2AmmMarket(fixture, setUpL2AmmMarketOpts)
}

export const setUpL2HopBridgeToken = async (fixture: IFixture) => {
  const { l2_hopBridgeToken, l2_bridge } = fixture

  await l2_hopBridgeToken.transferOwnership(l2_bridge.address)
}

export const setUpL1AndL2Messengers = async (fixture: IFixture, setUpL1AndL2MessengersOpts: any) => {
  const {
    user,
    l1ChainId,
    l2_bridge,
    l1_messenger,
    l1_messengerWrapper,
    l2_messenger,
    l2_messengerProxy
  } = fixture

  const { l2ChainId } = setUpL1AndL2MessengersOpts

  // Polygon's messenger is the messenger wrapper
  if (isChainIdPolygon(l2ChainId)) {
    // Set L2 bridge on proxy
    await l2_messengerProxy.setL2Bridge(l2_bridge.address)
    // NOTE: You cannot remove all members of a role. Instead, set to 0 and then remove the original
    await l2_messengerProxy.grantRole(DEFAULT_ADMIN_ROLE_HASH, ZERO_ADDRESS)
    await l2_messengerProxy.revokeRole(DEFAULT_ADMIN_ROLE_HASH, await user.getAddress())

    // Set Polygon-specific data
    const stateSender: string = l1_messenger.address
    const checkpointManager: string = getPolygonCheckpointManagerAddress(l1ChainId)
    const childTunnel: string = l2_messengerProxy.address

    await l1_messengerWrapper.setStateSender(stateSender)
    await l1_messengerWrapper.setCheckpointManager(checkpointManager)
    await l1_messengerWrapper.setChildTunnel(childTunnel)
    await l1_messengerWrapper.grantRole(DEFAULT_ADMIN_ROLE_HASH, ZERO_ADDRESS)
    await l1_messengerWrapper.revokeRole(DEFAULT_ADMIN_ROLE_HASH, await user.getAddress())

    // Set up L1 messenger
    await l1_messenger.setPolygonTarget(l2_messengerProxy.address)
    await l1_messenger.setIsPolygonL1(true)

    // Set up L2 messenger
    await l2_messenger.setPolygonTarget(l1_messengerWrapper.address)
    await l2_messenger.setIsPolygonL2(true)
  }

  // Set up L1
  await l1_messenger.setTargetMessenger(l2_messenger.address)

  // Set up L2
  await l2_messenger.setTargetMessenger(l1_messenger.address)
}

export const setUpL1AndL2Bridges = async (fixture: IFixture, opts: any) => {
  const {
    l2ChainId,
    governance,
    l1_messenger,
    l1_bridge,
    l1_messengerWrapper,
    l2_bridge,
    l2_messenger,
    l2_ammWrapper
  } = fixture

  const { messengerWrapperChainId } = opts

  // Set up L1
  await l1_bridge.connect(governance).setCrossDomainMessengerWrapper(
    messengerWrapperChainId,
    l1_messengerWrapper.address
  )

  // Set up L2
  let message: string = getSetL1BridgeAddressMessage(l1_bridge)
  await executeCanonicalMessengerSendMessage(
    l1_messenger,
    l1_messengerWrapper,
    l2_bridge,
    l2_messenger,
    governance,
    message,
    messengerWrapperChainId
  )

  const contractToUse: Contract = isChainIdPolygon(l2ChainId) ? l1_bridge : l1_messengerWrapper
  message = getSetL1MessengerWrapperAddressMessage(contractToUse)
  await executeCanonicalMessengerSendMessage(
    l1_messenger,
    l1_messengerWrapper,
    l2_bridge,
    l2_messenger,
    governance,
    message,
    messengerWrapperChainId
  )

  message = getSetAmmWrapperAddressMessage(l2_ammWrapper)
  await executeCanonicalMessengerSendMessage(
    l1_messenger,
    l1_messengerWrapper,
    l2_bridge,
    l2_messenger,
    governance,
    message,
    messengerWrapperChainId
  )
}

export const distributeCanonicalTokens = async (
  fixture: IFixture,
  opts: any
) => {
  const {
    l1_canonicalToken,
    user,
    liquidityProvider,
    bonder,
    challenger,
    relayer
  } = fixture

  const {
    userInitialBalance,
    liquidityProviderInitialBalance,
    bonderInitialBalance,
    challengerInitialBalance,
    relayerInitialBalance
  } = opts

  // NOTE: This will mint WETH even we are using an L1 ETH bridge
  // This is because the user needs to send WETH to the L2 in order to set up the system
  await l1_canonicalToken.mint(await user.getAddress(), userInitialBalance)
  await l1_canonicalToken.mint(
    await liquidityProvider.getAddress(),
    liquidityProviderInitialBalance
  )
  await l1_canonicalToken.mint(await bonder.getAddress(), bonderInitialBalance)
  await l1_canonicalToken.mint(
    await challenger.getAddress(),
    challengerInitialBalance
  )
  await l1_canonicalToken.mint(await relayer.getAddress(), relayerInitialBalance)
}

export const setUpBonderStake = async (fixture: IFixture, opts: any) => {
  const {
    bonder,
    l1_bridge,
    l1_canonicalToken,
    l2_hopBridgeToken,
    l2_canonicalToken,
    l2_bridge,
    l2_messenger,
    l2_swap,
    l2CanonicalTokenIsEth
  } = fixture

  const { l2ChainId, bondAmount, amountOutMin, deadline, relayerFee } = opts
  const txOpts = l2CanonicalTokenIsEth ? { value: bondAmount } : {}

  // Stake on L1
  if (l2CanonicalTokenIsEth) {
    await l1_bridge.connect(bonder).stake(await bonder.getAddress(), bondAmount, txOpts)
  } else {
    await l1_canonicalToken.connect(bonder).approve(l1_bridge.address, bondAmount)
    await l1_bridge.connect(bonder).stake(await bonder.getAddress(), bondAmount)
  }

  // Stake on L2
  await executeL1BridgeSendToL2(
    l1_canonicalToken,
    l1_bridge,
    l2_hopBridgeToken,
    l2_canonicalToken,
    l2_messenger,
    l2_swap,
    bonder,
    bonder,
    bonder,
    bondAmount,
    amountOutMin,
    deadline,
    relayerFee,
    l2ChainId
  )

  await l2_hopBridgeToken.connect(bonder).approve(l2_bridge.address, bondAmount)
  await l2_bridge.connect(bonder).stake(await bonder.getAddress(), bondAmount)
}

export const setUpL2AmmMarket = async (fixture: IFixture, opts: any) => {
  const {
    l1_bridge,
    l1_canonicalToken,
    l1_canonicalBridge,
    l2_hopBridgeToken,
    l2_messenger,
    liquidityProvider,
    l2_swap,
    l2_canonicalToken
  } = fixture

  const {
    l2ChainId,
    liquidityProviderBalance,
    amountOutMin,
    deadline,
    relayerFee
  } = opts

  // liquidityProvider moves funds across the canonical bridge
  await executeCanonicalBridgeSendTokens(
    l1_canonicalToken,
    l1_canonicalBridge,
    l2_canonicalToken,
    l2_messenger,
    liquidityProvider,
    liquidityProviderBalance,
    l2ChainId
  )

  // liquidityProvider moves funds across the Hop liquidity bridge
  await executeL1BridgeSendToL2(
    l1_canonicalToken,
    l1_bridge,
    l2_hopBridgeToken,
    l2_canonicalToken,
    l2_messenger,
    l2_swap,
    liquidityProvider,
    liquidityProvider,
    liquidityProvider,
    liquidityProviderBalance,
    amountOutMin,
    deadline,
    relayerFee,
    l2ChainId
  )

  // liquidityProvider adds liquidity to the pool on L2
  await l2_canonicalToken
    .connect(liquidityProvider)
    .approve(l2_swap.address, liquidityProviderBalance)
  await l2_hopBridgeToken
    .connect(liquidityProvider)
    .approve(l2_swap.address, liquidityProviderBalance)
  await l2_swap
    .connect(liquidityProvider)
    .addLiquidity(
      [liquidityProviderBalance, liquidityProviderBalance],
      '0',
      DEFAULT_DEADLINE
    )
  await expectBalanceOf(l2_canonicalToken, liquidityProvider, '0')
  await expectBalanceOf(l2_hopBridgeToken, liquidityProvider, '0')

  const ERC20 = await ethers.getContractFactory('@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20')

  const swapStorage = await l2_swap.swapStorage()
  const lpTokenAddress = swapStorage.lpToken
  const lpToken = ERC20.attach(lpTokenAddress)

  const lpTokenTotalBalance: BigNumber = await lpToken.totalSupply()
  await expectBalanceOf(
    lpToken,
    liquidityProvider,
    lpTokenTotalBalance
  )
  await expectBalanceOf(
    l2_canonicalToken,
    l2_swap,
    liquidityProviderBalance
  )
  await expectBalanceOf(
    l2_hopBridgeToken,
    l2_swap,
    liquidityProviderBalance
  )
}

/**
 * General functions
 */
export const expectBalanceOf = async (
  token: Contract,
  account: Signer | Contract,
  expectedBalance: BigNumberish
) => {
  const balance: BigNumber = await getCanonicalTokenBalance(token, account)

  if (await token.symbol() === 'L1WETH') {
    const expectedBalanceBN: BigNumber = BigNumber.from(expectedBalance)
    const gasCost: BigNumber = BigNumber.from('10000000000000000')
    expect(balance.lte(expectedBalanceBN)).to.eq(true)
    expect(balance.gte(expectedBalanceBN.sub(gasCost))).to.eq(true)
  } else {
    expect(balance.toString()).to.eq(BigNumber.from(expectedBalance).toString())
  }
}

export const getCustomArtifacts = (chainId: BigNumber, l2CanonicalTokenIsEth: boolean) => {
  let l1_bridgeArtifact: string
  let l2_bridgeArtifact: string
  let l1_messengerArtifact: string
  let l1_messengerWrapperArtifact: string

  if (l2CanonicalTokenIsEth) {
    l1_bridgeArtifact = 'contracts/test/Mock_L1_ETH_Bridge.sol:Mock_L1_ETH_Bridge'
  } else {
    l1_bridgeArtifact = 'contracts/test/Mock_L1_ERC20_Bridge.sol:Mock_L1_ERC20_Bridge'
  }

  if (isChainIdOptimism(chainId)) {
    l2_bridgeArtifact = 'contracts/test/Mock_L2_OptimismBridge.sol:Mock_L2_OptimismBridge'
    l1_messengerArtifact = 'contracts/test/Mock_L1_Messenger.sol:Mock_L1_Messenger'
    l1_messengerWrapperArtifact =
      'contracts/wrappers/OptimismMessengerWrapper.sol:OptimismMessengerWrapper'
  } else if (isChainIdArbitrum(chainId)) {
    l2_bridgeArtifact = 'contracts/test/Mock_L2_ArbitrumBridge.sol:Mock_L2_ArbitrumBridge'
    l1_messengerArtifact = 'contracts/test/Mock_L1_Messenger.sol:Mock_L1_Messenger'
    l1_messengerWrapperArtifact =
      'contracts/wrappers/ArbitrumMessengerWrapper.sol:ArbitrumMessengerWrapper'
  } else if (isChainIdXDai(chainId)) {
    l2_bridgeArtifact = 'contracts/test/Mock_L2_XDaiBridge.sol:Mock_L2_XDaiBridge'
    l1_messengerArtifact = 'contracts/test/Mock_L1_Messenger.sol:Mock_L1_Messenger'
    l1_messengerWrapperArtifact =
      'contracts/wrappers/XDaiMessengerWrapper.sol:XDaiMessengerWrapper'
  } else if (isChainIdPolygon(chainId)) {
    l2_bridgeArtifact = 'contracts/test/Mock_L2_PolygonBridge.sol:Mock_L2_PolygonBridge'
    l1_messengerArtifact = 'contracts/test/Mock_L1_Messenger.sol:Mock_L1_Messenger'
    l1_messengerWrapperArtifact =
      'contracts/test/MockPolygonMessengerWrapper.sol:MockPolygonMessengerWrapper'
  }

  return {
    l1_bridgeArtifact,
    l2_bridgeArtifact,
    l1_messengerArtifact,
    l1_messengerWrapperArtifact
  }
}

export const getRootHashFromTransferId = (transferId: Buffer) => {
  const tree: MerkleTree = new MerkleTree([transferId], merkleHash)
  const rootHash: Buffer = tree.getRoot()
  const rootHashHex: string = tree.getHexRoot()

  return {
    rootHash,
    rootHashHex
  }
}

export const getTransferRootId = (rootHash: string, totalAmount: BigNumber) => {
  return ethers.utils.solidityKeccak256(
    ['bytes32', 'uint256'],
    [rootHash, totalAmount]
  )
}

export const getTransferNonceFromEvent = async (
  l2_bridge: Contract,
  transferIndex: BigNumber = BigNumber.from('0')
): Promise<string> => {
  const transfersSentEvent = await l2_bridge.queryFilter(
    l2_bridge.filters.TransferSent()
  )
  return transfersSentEvent[transferIndex.toNumber()].topics[3]
}

export const getTransferNonce = (
  transferNonceIncrementer: BigNumber,
  chainId: BigNumber
): string => {
  const nonceDomainSeparator = getNonceDomainSeparator()
  return ethers.utils.solidityKeccak256(
    ['bytes32', 'uint256', 'uint256'],
    [nonceDomainSeparator, chainId, transferNonceIncrementer]
  )
}

export const getNonceDomainSeparator = (): string => {
  // keccak256(abi.encodePacked("L2_Bridge v1.0"));
  const domainSeparatorString: string = 'L2_Bridge v1.0'
  return ethers.utils.solidityKeccak256(['string'], [domainSeparatorString])
}

const merkleHash = (el: Buffer | string): Buffer => {
  return Buffer.from(keccak256(el).slice(2), 'hex')
}

export const getNewMerkleTree = (transferIds: Buffer[]): MerkleTree => {
  return new MerkleTree(transferIds, merkleHash, {
    fillDefaultHash: () => ethersUtils.keccak256(Buffer.alloc(32))
  })
}

export const didAttemptedSwapSucceed = async (
  canonicalToken: Contract,
  recipient: Signer,
  balanceBeforeAttemptedSwap: BigNumber
): Promise<boolean> => {
  const currentBalance: BigNumber = await canonicalToken.balanceOf(await recipient.getAddress())
  return !(currentBalance.eq(balanceBeforeAttemptedSwap))
}

export const getCanonicalTokenBalance = async (token: Contract, account: Signer | Contract): Promise<BigNumber> => {
  let balance: BigNumber
  if (await token.symbol() === 'L1WETH') {
    balance = await account.getBalance()
  } else {
    const accountAddress: string = account instanceof Signer ? await account.getAddress() : account.address
    balance = await token.balanceOf(accountAddress)
  }

  return balance
}

/**
 * Timing functions
 */

export const takeSnapshot = async () => {
  return await ethers.provider.send('evm_snapshot', [])
}

export const revertSnapshot = async (id: string) => {
  await ethers.provider.send('evm_revert', [id])
}

export const mineBlock = async (seconds: number) => {
  const blockTimestamp: number = (await ethers.provider.getBlock('latest'))
    .timestamp
  await ethers.provider.send('evm_mine', [blockTimestamp + seconds])
}

export const increaseTime = async (seconds: number) => {
  await mineBlock(seconds)
}

export const minerStop = async () => {
  await ethers.provider.send('miner_stop', [])
}

export const minerStart = async () => {
  await ethers.provider.send('miner_start', [])
}

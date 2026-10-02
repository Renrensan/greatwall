/**
 * Human-readable ABI fragments for IPoW contract test page.
 *
 * These match the verified Solidity function signatures from:
 * - iPoWV1Conversion.sol  (programmable-network/ethereum/contracts/)
 * - BetaHub.sol
 * - BetaVault.sol
 *
 * Only the functions/events needed by the test page are included.
 * ethers.js parses human-readable ABI natively.
 */

// ─────────────────────────── iPoWV1Conversion ───────────────────────────

export const IPOW_V1_CONVERSION_ABI = [
  // ---- Write functions ----
  "function commitTokenToBitcoin(uint256 nativeAmount, uint256 bitcoinAmount, bytes userProgram, uint256 requiredBond, address tokenAddr, tuple(address mint, uint256 amount)[] extraTokens) payable",
  "function commitBitcoinToToken(uint256 bitcoinAmount, uint256 nativeAmount, bytes userProgram, uint256 requiredBond, address tokenAddr) payable",
  "function proposeClaimConversion(uint256 txId, uint256 proposedRateAmount, uint256 dutyWindowSeconds, bytes ipowReceiveProgram) payable",
  "function finalizeClaimConversion(uint256 txId)",
  "function depositApprovedConversion(uint256 txId) payable",
  "function submitBitcoinMerkleProofWithTx(uint256 txId, bytes txRaw, uint256 voutIndex, uint256 blockHeight, bytes32[] branchLE, uint256 index)",
  "function openBundleTunnel(uint256 nativeAmount, uint256 bitcoinAmount, address tokenAddr, tuple(address mint, uint256 amount)[] extraTokens, address destAddress, uint256 networkId, bytes networkAddress, uint256 dutyWindowSeconds, bytes ipowReceiveProgram) payable",

  // ---- Refund / reclaim ----
  "function refundNoProofNativeToBitcoin(uint256 txId)",
  "function reclaimExpiredConversion(uint256 txId)",
  "function claimNativeOperatorExpired(uint256 txId)",

  // ---- View functions ----
  "function nextTxId() view returns (uint256)",
  "function commitFeeBps() view returns (uint256)",
  // Solidity's auto-generated getter skips array-typed `extraTokens`, `networkAddress`:
  "function conversions(uint256) view returns (address user, bool isNativeToBitcoin, bytes userProgram, bytes ipowReceiveProgram, uint256 networkId, address tokenAddr, uint256 nativeAmount, uint256 bitcoinAmount, uint256 commitFee, uint256 reservedNative, uint256 createdAt, uint256 depositedAt, uint256 operatorDutyExpiresAt, uint8 status, bool windowStarted, uint256 windowStartHeight, bool proofVerified, uint256 proofBlockHeight, address responsibleOperator, uint256 stakedBond, uint256 requiredBond, uint256 claimStartedAt, uint256 lastClaimAt, uint256 dutyWindowSeconds, uint256 bounty)",

  // ---- Constants ----
  "function BPS_DENOM() view returns (uint256)",
  "function DEPOSIT_BLOCKS_WINDOW() view returns (uint256)",
  "function PROOF_BLOCKS_WINDOW() view returns (uint256)",
  "function CLAIM_WINDOW_SEC() view returns (uint256)",
  "function CLAIM_QUIET_PERIOD_SEC() view returns (uint256)",

  // ---- Events ----
  "event ConversionCommitted(uint256 indexed txId, address indexed user, bool isNativeToBitcoin)",
  "event ClaimProposed(uint256 indexed txId, address indexed claimant, uint256 stakeAmount, uint256 proposedRateAmount)",
  "event ClaimFinalized(uint256 indexed txId, address indexed responsibleOperator)",
  "event ClaimReclaimed(uint256 indexed txId, bool forfeited)",
  "event ConversionDeposited(uint256 indexed txId, uint256 nativeAmount)",
  "event ConversionCompleted(uint256 indexed txId)",
  "event ConversionRefunded(uint256 indexed txId, uint256 refundNative)",
];

// ─────────────────────────── BetaHub ───────────────────────────────────

export const BETA_HUB_ABI = [
  // ---- Write functions ----
  "function lockLocal(uint64 compositionId, uint64 nonce, uint64 units, uint64 deadline) payable returns (bytes32 pendingId)",
  "function approvePending(uint64 nonce, uint64[] remoteLockId)",
  "function exerciseMint(address user, uint64 nonce) returns (uint256 minted)",
  "function settleMint(bytes32 txidLE)",
  "function expirePending(address user, uint64 nonce)",

  // ---- View functions ----
  // Solidity auto-generated getter omits array fields (remoteLockId, remoteAnchorTxid):
  "function pending(bytes32) view returns (address user, uint64 nonce, uint64 compositionId, uint64 units, uint64 deadline, bool approved, bytes32 queuedBy, uint64 createdAt)",
  "function pendingRemoteLockId(bytes32 pendingId) view returns (uint64[])",
  "function pendingRemoteAnchorTxid(bytes32 pendingId) view returns (bytes32[])",
  "function paused() view returns (bool)",

  // ---- Events ----
  "event PendingCreated(bytes32 indexed pendingId, address indexed user, uint64 nonce, uint64 compositionId, uint64 units, uint64 deadline)",
  "event PendingApproved(bytes32 indexed pendingId, uint64[] remoteLockId)",
  "event Minted(bytes32 indexed pendingId, address indexed user, uint256 amount)",
  "event PendingExpired(bytes32 indexed pendingId)",
];

// ─────────────────────────── BetaVault ──────────────────────────────────

export const BETA_VAULT_ABI = [
  // ---- Write functions ----
  "function deposit(address token, bytes32 solUser, uint64 nonce, uint64 units, uint64 deadline) payable returns (uint64 lockId)",
  "function processAnchor(bytes32 partyId, bytes statement, bytes txRaw, uint256 blockHeight, bytes32[] branchLE, uint256 index)",
  "function executeRelease(bytes32 txidLE)",
  "function settleRelease(bytes32 txidLE)",
  "function refund(uint64 lockId)",

  // ---- View functions ----
  "function locks(uint64) view returns (bytes32 solUser, uint64 nonce, uint64 units, uint64 deadline, uint8 state, address depositor, address token, uint256 amount)",
  "function nextLockId() view returns (uint64)",
  "function paused() view returns (bool)",

  // ---- Events ----
  "event Deposited(uint64 indexed lockId, bytes32 indexed solUser, uint64 nonce, uint64 units, uint64 deadline, address depositor, address token)",
  "event Finalized(uint64 indexed lockId, bytes32 indexed txidLE)",
  "event ReleaseQueued(bytes32 indexed txidLE, uint64 lockId, address to, uint64 units, uint64 challengeUntil)",
  "event Released(bytes32 indexed txidLE, uint64 lockId, address to, uint256 amount)",
  "event Refunded(uint64 indexed lockId)",
];

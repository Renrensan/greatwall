// What each kind of protocol transaction means, for the Explorer page's
// details: what happened, in plain words, and why the protocol does it.
// Keyed by the transaction's kind, `<contract or program>.<event or
// instruction>` (ExplorerTx.kind): EVM events and Solana instructions of the
// same step share an entry.

export type Explained = { what: string; why: string };

const E = (what: string, why: string): Explained => ({ what, why });

const CONCEPTS: [string[], Explained][] = [
  [
    ["lightClient.BlockStored", "lightClient.extend", "lightClient.extend_back"],
    E(
      "New Bitcoin block headers were added to this network's copy of Bitcoin's chain. The network checked each header's proof of work itself before saving it.",
      "Every network keeps its own copy of Bitcoin's chain (a light client), so it can check Bitcoin facts without trusting anyone. Operators keep it up to date.",
    ),
  ],
  [
    ["lightClient.Jumped", "lightClient.jump", "lightClient.EpochStartRecorded", "lightClient.add_epoch_start"],
    E(
      "This network's copy of Bitcoin caught up to a recent block, anchored to the start of a Bitcoin difficulty period (every 2,016 blocks).",
      "Knowing the difficulty of each period is what lets the network check that a block's proof of work is real, without storing all of Bitcoin's history.",
    ),
  ],
  [
    ["lightClient.begin_walk", "lightClient.walk_step", "lightClient.close_walk"],
    E(
      "The network confirmed that one stored Bitcoin block descends from another, stepping back block by block. On Solana this takes several transactions; the last one closes the check.",
      "It proves an older Bitcoin block (holding an operator's registration or message) sits below a block already certified as real, so that older block can be trusted too.",
    ),
  ],
  [
    ["protocol.BondLocked", "protocol.lock_bond", "protocol.BondWithdrawn", "protocol.withdraw_bond"],
    E(
      "An operator locked (or took back) stake in the protocol on this network.",
      "Operators stake money to take jobs. If they cheat or miss a duty, guardians can take that stake, so lying costs more than it pays.",
    ),
  ],
  [
    ["protocol.ChainHeadSet", "protocol.register_chain_head", "protocol.advance_chain_head"],
    E(
      "An operator named the Bitcoin coin its job transactions spend, one after another, like links in a chain.",
      "Each Bitcoin coin can be spent only once, so an operator can't show different stories to different networks: everyone follows the same chain of transactions on Bitcoin.",
    ),
  ],
  [
    ["protocol.JobOpened", "protocol.open_job", "vault.open_checkpoint", "protocol.ApplicationRegistered"],
    E(
      "Someone asked for a checkpoint: a job for an operator to prove a recent Bitcoin block on this network, with a stake behind it.",
      "Messages between networks only count once a recent Bitcoin block above them is certified real. A checkpoint job makes such a block.",
    ),
  ],
  [
    ["protocol.BidPlaced", "protocol.bid"],
    E("An operator took the job by bidding, putting part of its stake behind doing it on time.", "Operators compete for jobs; the one that takes it must finish before the deadline or lose stake."),
  ],
  [
    ["protocol.JobAnchored", "protocol.anchor_job"],
    E(
      "The operator fixed the Bitcoin block its work starts from, and then writes a tagged Bitcoin transaction after it.",
      "Anchoring to a known block stops an operator from building on a fake or old branch of Bitcoin.",
    ),
  ],
  [
    ["protocol.JobProven", "protocol.prove_job"],
    E(
      "The operator showed its Bitcoin transaction inside a block this network has stored. A 36-hour window starts in which anyone can challenge the proof.",
      "If nobody proves it wrong within the window, the block counts as real, and every message below it can be accepted.",
    ),
  ],
  [
    ["protocol.JobSettled", "protocol.settle", "protocol.JobExpired", "protocol.expire", "protocol.Credited", "protocol.CreditWithdrawn"],
    E("A job ended: the operator was paid (or, if nobody took it, the payment went back), and its stake was freed.", "Closing jobs releases stake and fees, so operators keep taking new work."),
  ],
  [
    ["protocol.Attested", "protocol.attest"],
    E("An attester vouched for a job's proof, putting its own stake behind it.", "A second party's stake lets an application rely on the proof sooner, while the challenge window still protects everyone."),
  ],
  [
    ["protocol.JobSlashed", "protocol.report_missed_duty", "protocol.ForkChallenged", "protocol.challenge_fork", "protocol.ask_parent", "protocol.ChallengeWon", "protocol.ChallengeFailed"],
    E(
      "A guardian challenged an operator: a missed deadline, or a proof built on a fake branch of Bitcoin. The challenge was asked, answered or decided here.",
      "Guardians watch operators. A proven lie or a missed duty takes the operator's stake, part of it to the guardian, which is what keeps operators honest.",
    ),
  ],
  [
    ["vaultHome.Locked", "vault.lock"],
    E("A user locked an asset in the vault on its own network, to receive it on the paired network.", "The asset stays here as backing. Its receipt is issued on the other network: at once on the fast path, or after the claim on the slow path."),
  ],
  [
    ["vaultReceipts.Burned", "vault.make_request"],
    E("A user burned a receipt to unlock the original asset back on its home network.", "Burning removes the receipt from circulation. The asset is then paid out on its home network: at once on the fast path, or after the claim."),
  ],
  [
    ["vaultReceipts.Attested", "vault.attest_lock"],
    E(
      "An operator gave the user their receipt at once (the fast path), putting up 1.25 times the amount in its own receipts as a guarantee.",
      "The user doesn't wait for Bitcoin and the 7-day claim. The operator is repaid once its claim proves the lock, and loses its guarantee if it lied.",
    ),
  ],
  [
    ["vaultHome.FastPaid", "vault.fast_pay"],
    E("Someone paid out an unlock at once (the fast path), from their own funds.", "The user gets the asset now. Whoever paid is repaid by the vault once a claim proves the burn."),
  ],
  [
    ["vaultReceipts.Issued", "vault.issue", "vaultHome.RequestPaid", "vault.pay_request"],
    E("A receipt was issued, or an unlock paid, by the slow path: after a claim proving the lock or burn was accepted.", "This is the path that needs no one's money up front: Bitcoin and the 7-day objection window are the proof."),
  ],
  [
    ["vaultReceipts.GenesisIssued", "vault.genesis_issue", "vaultReceipts.GenesisReceipt", "vault.genesis_make_receipt", "vaultReceipts.GenesisFinalized", "vault.finalize_genesis"],
    E(
      "A genesis step: during the vault's one-time start, the deployer made a receipt or issued a real lock directly, or closed genesis for good.",
      "Genesis gives operators the receipts they need to offer the fast path from day one. Every genesis action is published and checked against a real lock.",
    ),
  ],
  [
    ["vaultReceipts.ReceiptMade", "vault.make_receipt", "vaultHome.AssetRegistered", "vault.register_asset"],
    E("A token was registered in its home vault, or its receipt token was created on the paired network.", "Any token can join; its receipt exists once a claim (or genesis) brings its record over."),
  ],
  [
    ["vaultReceipts.GivenUp", "vault.give_up", "vaultHome.LockReturned", "vault.return_lock"],
    E("A lock nobody carried in time was given up, and the asset returned to its owner.", "Nothing gets stuck forever: if no operator delivers a lock, the user can take it back."),
  ],
  [
    ["vault.MessageBatch", "vault.MessageProcessed", "vault.submit_message", "vault.ClaimOpened"],
    E(
      "An operator brought a batch of records (locks, unlocks, bonds) from the paired network, anchored in a Bitcoin transaction. It opens a claim.",
      "This is how networks learn about each other: through Bitcoin, which neither the operator nor anyone else can rewrite.",
    ),
  ],
  [
    ["vault.ClaimDecided", "vault.decide", "vault.RealBlock"],
    E("A claim's 7-day objection window ended and it was decided; or a Bitcoin block was certified as real for this pair.", "An accepted claim makes its records final: receipts are issued, unlocks paid, fast-path operators repaid."),
  ],
  [
    ["vault.Objected", "vault.object", "vault.Answered", "vault.answer", "vault.Slashed"],
    E(
      "A guardian objected to a claim, the operator answered, or a lying operator was slashed.",
      "Any false record is proven on the network where its fact lives, and the operator loses every bond. That's why nobody needs to trust the operator.",
    ),
  ],
  [
    ["vault.ChainRegistered", "vault.register_chain"],
    E(
      "An operator joined this vault pair: its registration on Bitcoin was accepted here.",
      "Only a registered operator can carry messages or give receipts at once on this pair, so users know who is accountable.",
    ),
  ],
  [
    ["vault.BondChanged", "vault.add_bond_home", "vault.add_bond_receipt", "vault.DepositsChanged", "vault.add_deposits"],
    E("An operator added to (or changed) its bond in a token, or its claim deposits, in this vault.", "A bond in a token is what the operator loses if it lies about that token. Claims are limited to 80% of it."),
  ],
  [
    [
      "conversion.Sold",
      "conversion.sell",
      "conversion.sell_in_window",
      "conversion.Bought",
      "conversion.buy",
      "conversion.buy_for",
      "conversion.Funded",
      "conversion.fund",
      "conversion.Completed",
      "conversion.complete_buy",
      "conversion.complete_sell",
      "conversion.Refunded",
      "conversion.refund_sell",
      "conversion.Cancelled",
      "conversion.cancel",
      "conversion.Reclaimed",
      "conversion.reclaim",
      "conversion.PaymentWindow",
    ],
    E(
      "A step of a conversion between this network's assets and real Bitcoin: a user's order, an operator taking it, the Bitcoin payment proven, or a refund.",
      "Conversions settle against real Bitcoin payments, proven on this network by its own copy of Bitcoin's chain.",
    ),
  ],
  [
    ["betaBaskets.BasketCreated", "betaBasket.create_basket"],
    E("Someone created an index token: one token backed by fixed amounts of several assets.", "Anyone can create one; its creator earns its mint and burn fee."),
  ],
  [
    ["betaBaskets.Minted", "betaBasket.mint"],
    E("Index tokens were minted: the user deposited each asset of the index's mix, plus the creator's fee.", "Every index token is fully backed by what the index holds."),
  ],
  [
    ["betaBaskets.Burned", "betaBasket.burn"],
    E("Index tokens were burned: the user got back their share of each asset the index holds, less the creator's fee.", "Burning always returns your share, so an index token is worth its parts."),
  ],
  [
    ["betaBasket.collect_fees", "betaBaskets.FeesCollected", "betaBasket.collect_owed", "betaBaskets.Collected"],
    E("The creator collected fees earned by the index, or a holder collected a part owed to them from an earlier burn.", "Fees are set aside in each part as tokens are minted and burned; they're collected separately."),
  ],
];

const BY_KIND = new Map<string, Explained>(CONCEPTS.flatMap(([kinds, e]) => kinds.map((k) => [k, e] as [string, Explained])));

/** What a kind of transaction means, if the explorer knows it. */
export function explain(kind: string | undefined): Explained | null {
  return kind ? (BY_KIND.get(kind) ?? null) : null;
}

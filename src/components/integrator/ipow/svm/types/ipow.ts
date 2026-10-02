/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ipow.json`.
 */
export type Ipow = {
  "address": "EsmGbkui9ZFC6Fch9J6xoyNRZSp6TwfvcjS88beP1Vem",
  "metadata": {
    "name": "ipow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addLiquidity",
      "discriminator": [
        181,
        157,
        89,
        67,
        143,
        182,
        52,
        72
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "addNetwork",
      "discriminator": [
        88,
        116,
        116,
        189,
        41,
        140,
        135,
        172
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "networkConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "networkId"
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "networkId",
          "type": "u64"
        },
        {
          "name": "minAddrLen",
          "type": "u16"
        },
        {
          "name": "maxAddrLen",
          "type": "u16"
        }
      ]
    },
    {
      "name": "approveAndStartWithAnchor",
      "discriminator": [
        113,
        51,
        151,
        249,
        125,
        46,
        26,
        126
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "docs": [
            "above; not read or written by this instruction's handler."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true
        },
        {
          "name": "usedProgramPda",
          "docs": [
            "above; the handler explicitly checks `data_is_empty()` before manually",
            "creating this account via CPI, preventing reuse of the same Bitcoin",
            "program hash across conversions."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  100,
                  95,
                  112,
                  114,
                  111,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "programHash"
              }
            ]
          }
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "dutyWindowSeconds",
          "type": "i64"
        },
        {
          "name": "ipowReceiveProgram",
          "type": "bytes"
        },
        {
          "name": "programHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "claimNativeAfterOperatorExpired",
      "discriminator": [
        106,
        12,
        54,
        71,
        107,
        202,
        247,
        110
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "relations": [
            "conversion"
          ]
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "closeNoBitcoinBitcoinToNative",
      "discriminator": [
        233,
        114,
        238,
        244,
        227,
        48,
        58,
        239
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true
        },
        {
          "name": "conversion",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "commitBitcoinToNative",
      "discriminator": [
        66,
        107,
        203,
        28,
        177,
        227,
        56,
        47
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  118,
                  101,
                  114,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "global_state.next_tx_id",
                "account": "globalState"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bitcoinAmount",
          "type": "u64"
        },
        {
          "name": "nativeAmount",
          "type": "u64"
        },
        {
          "name": "networkId",
          "type": "u64"
        },
        {
          "name": "networkAddress",
          "type": "bytes"
        },
        {
          "name": "userProgram",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "commitGlobalHeader",
      "discriminator": [
        7,
        35,
        38,
        214,
        91,
        62,
        171,
        36
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "header",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  101,
                  97,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "height"
              }
            ]
          }
        },
        {
          "name": "prevHeightTracker",
          "docs": [
            "`height > 0`) via `Pubkey::find_program_address` against the expected",
            "tracker PDA for `height - 1`, and rejected with `InvalidTrackerAccount` on",
            "mismatch — done manually rather than via a declarative `seeds` constraint",
            "because the seed depends on `height - 1`, which would underflow when",
            "`height == 0`."
          ]
        },
        {
          "name": "prevEpochStartHeader",
          "optional": true
        },
        {
          "name": "prevEpochEndHeader",
          "optional": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "header80",
          "type": {
            "array": [
              "u8",
              80
            ]
          }
        },
        {
          "name": "height",
          "type": "u64"
        }
      ]
    },
    {
      "name": "commitNativeToBitcoin",
      "discriminator": [
        167,
        194,
        177,
        146,
        5,
        156,
        155,
        116
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  118,
                  101,
                  114,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "global_state.next_tx_id",
                "account": "globalState"
              }
            ]
          }
        },
        {
          "name": "networkConfig",
          "optional": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nativeAmount",
          "type": "u64"
        },
        {
          "name": "bitcoinAmount",
          "type": "u64"
        },
        {
          "name": "networkId",
          "type": "u64"
        },
        {
          "name": "networkAddress",
          "type": "bytes"
        },
        {
          "name": "userProgram",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "depositApprovedConversion",
      "discriminator": [
        143,
        114,
        73,
        65,
        85,
        55,
        224,
        10
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "conversion"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "operator",
          "type": "pubkey"
        },
        {
          "name": "commitFeeBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "operatorOpenTunnel",
      "discriminator": [
        110,
        231,
        98,
        218,
        15,
        220,
        230,
        152
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "docs": [
            "above; only ever read (`.lamports()`) for the liquidity-availability check,",
            "never written here."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  118,
                  101,
                  114,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "global_state.next_tx_id",
                "account": "globalState"
              }
            ]
          }
        },
        {
          "name": "usedProgramPda",
          "docs": [
            "above; the handler explicitly checks `data_is_empty()` before manually",
            "creating this account via CPI, preventing reuse of the same Bitcoin",
            "program hash across conversions."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  100,
                  95,
                  112,
                  114,
                  111,
                  103
                ]
              },
              {
                "kind": "arg",
                "path": "programHash"
              }
            ]
          }
        },
        {
          "name": "networkConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "networkId"
              }
            ]
          }
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bitcoinAmount",
          "type": "u64"
        },
        {
          "name": "nativeAmount",
          "type": "u64"
        },
        {
          "name": "networkId",
          "type": "u64"
        },
        {
          "name": "destAddress",
          "type": "pubkey"
        },
        {
          "name": "networkAddress",
          "type": "bytes"
        },
        {
          "name": "dutyWindowSeconds",
          "type": "i64"
        },
        {
          "name": "ipowReceiveProgram",
          "type": "bytes"
        },
        {
          "name": "lockedAnchorHeight",
          "type": "u64"
        },
        {
          "name": "programHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "refundAfterNoProofNativeToBitcoin",
      "discriminator": [
        173,
        100,
        64,
        152,
        199,
        76,
        238,
        122
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "relations": [
            "conversion"
          ]
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "refundIfNotApproved",
      "discriminator": [
        153,
        235,
        150,
        110,
        132,
        19,
        29,
        255
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true,
          "relations": [
            "conversion"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "removeLiquidity",
      "discriminator": [
        80,
        85,
        209,
        72,
        24,
        206,
        177,
        108
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "docs": [
            "above; only used as the source of a System Program lamport transfer via",
            "`invoke_signed` with the escrow's own PDA seeds, which the runtime itself",
            "validates."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submitBitcoinProofCache",
      "discriminator": [
        75,
        60,
        230,
        110,
        50,
        133,
        73,
        38
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true
        },
        {
          "name": "proofCache",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  111,
                  102
                ]
              },
              {
                "kind": "account",
                "path": "conversion.tx_id",
                "account": "conversion"
              }
            ]
          }
        },
        {
          "name": "heightTracker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  99,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "proofBlockHeight"
              }
            ]
          }
        },
        {
          "name": "header",
          "optional": true
        },
        {
          "name": "operator",
          "docs": [
            "after being flagged as a real fund-redirection risk: without this, the",
            "handler would pay `conversion.native_amount` (native-to-bitcoin",
            "completion path) and any outstanding `commit_fee` to whatever account",
            "was supplied here, with no check tying it to the protocol's actual",
            "operator."
          ],
          "writable": true
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "txRaw",
          "type": "bytes"
        },
        {
          "name": "voutIndex",
          "type": "u64"
        },
        {
          "name": "proofBlockHeight",
          "type": "u64"
        },
        {
          "name": "branchLe",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        },
        {
          "name": "index",
          "type": "u64"
        }
      ]
    },
    {
      "name": "tryFinalizeCachedProof",
      "discriminator": [
        117,
        255,
        183,
        94,
        33,
        43,
        54,
        163
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "escrowVault",
          "docs": [
            "above; only used as the source of a System Program lamport transfer via",
            "`invoke_signed` with the escrow's own PDA seeds, which the runtime itself",
            "validates."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              }
            ]
          }
        },
        {
          "name": "conversion",
          "writable": true
        },
        {
          "name": "proofCache",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  111,
                  102
                ]
              },
              {
                "kind": "account",
                "path": "conversion.tx_id",
                "account": "conversion"
              }
            ]
          }
        },
        {
          "name": "heightTracker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  99,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "proof_cache.proof_block_height",
                "account": "proofCache"
              }
            ]
          }
        },
        {
          "name": "header",
          "optional": true
        },
        {
          "name": "operator",
          "docs": [
            "after being flagged as a real fund-redirection risk: without this, the",
            "handler could pay out `conversion.native_amount` and any outstanding",
            "`commit_fee` to whatever account was supplied here."
          ],
          "writable": true
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updateNetwork",
      "discriminator": [
        39,
        115,
        188,
        77,
        162,
        232,
        216,
        161
      ],
      "accounts": [
        {
          "name": "globalState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "networkConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "networkId"
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "networkId",
          "type": "u64"
        },
        {
          "name": "minAddrLen",
          "type": "u16"
        },
        {
          "name": "maxAddrLen",
          "type": "u16"
        },
        {
          "name": "isActive",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "conversion",
      "discriminator": [
        166,
        162,
        161,
        65,
        158,
        55,
        109,
        27
      ]
    },
    {
      "name": "globalHeader",
      "discriminator": [
        254,
        42,
        78,
        220,
        103,
        159,
        102,
        120
      ]
    },
    {
      "name": "globalState",
      "discriminator": [
        163,
        46,
        74,
        168,
        216,
        123,
        133,
        98
      ]
    },
    {
      "name": "heightTracker",
      "discriminator": [
        171,
        131,
        119,
        208,
        250,
        114,
        237,
        46
      ]
    },
    {
      "name": "proofCache",
      "discriminator": [
        214,
        67,
        52,
        16,
        45,
        191,
        77,
        250
      ]
    },
    {
      "name": "supportedNetwork",
      "discriminator": [
        24,
        190,
        84,
        238,
        161,
        129,
        71,
        191
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Action performed by unauthorized party"
    },
    {
      "code": 6001,
      "name": "invalidFeeConfig",
      "msg": "Invalid fee configuration"
    },
    {
      "code": 6002,
      "name": "zeroValue",
      "msg": "Required input value is zero"
    },
    {
      "code": 6003,
      "name": "badState",
      "msg": "Contract is in an invalid state for this action"
    },
    {
      "code": 6004,
      "name": "approveWindowOver",
      "msg": "Approve window has expired"
    },
    {
      "code": 6005,
      "name": "incorrectWindow",
      "msg": "Action falls outside the allowed block window"
    },
    {
      "code": 6006,
      "name": "noHeadersYet",
      "msg": "No headers available yet"
    },
    {
      "code": 6007,
      "name": "incorrectValue",
      "msg": "Incorrect value provided"
    },
    {
      "code": 6008,
      "name": "badBitcoinProgram",
      "msg": "Bitcoin program is malformed"
    },
    {
      "code": 6009,
      "name": "wrongConversionType",
      "msg": "Wrong conversion type for this action"
    },
    {
      "code": 6010,
      "name": "invalidHeader",
      "msg": "Invalid Bitcoin Header or Merkle Proof"
    },
    {
      "code": 6011,
      "name": "alreadyVerified",
      "msg": "Proof has already been verified"
    },
    {
      "code": 6012,
      "name": "needDutyWindow",
      "msg": "Need Duty Window"
    },
    {
      "code": 6013,
      "name": "lowWork",
      "msg": "Low Proof of Work"
    },
    {
      "code": 6014,
      "name": "invalidRetarget",
      "msg": "Invalid Difficulty Retarget"
    },
    {
      "code": 6015,
      "name": "transactionTooShort",
      "msg": "Transaction too short"
    },
    {
      "code": 6016,
      "name": "transactionOverflow",
      "msg": "Transaction overflow"
    },
    {
      "code": 6017,
      "name": "voutOutOfBounds",
      "msg": "Vout out of bounds"
    },
    {
      "code": 6018,
      "name": "valueOutOfBounds",
      "msg": "Value out of bounds"
    },
    {
      "code": 6019,
      "name": "programOutOfBounds",
      "msg": "Program out of bounds"
    },
    {
      "code": 6020,
      "name": "varIntOutOfBounds",
      "msg": "VarInt out of bounds"
    },
    {
      "code": 6021,
      "name": "var16OutOfBounds",
      "msg": "Var16 out of bounds"
    },
    {
      "code": 6022,
      "name": "var32OutOfBounds",
      "msg": "Var32 out of bounds"
    },
    {
      "code": 6023,
      "name": "var64OutOfBounds",
      "msg": "Var64 out of bounds"
    },
    {
      "code": 6024,
      "name": "dutyNotExpired",
      "msg": "Duty Not Expired"
    },
    {
      "code": 6025,
      "name": "invalidAddressLength",
      "msg": "Invalid Network Address Length"
    },
    {
      "code": 6026,
      "name": "mustBeContiguous",
      "msg": "Blocks must be submitted contiguously while conversions are active"
    },
    {
      "code": 6027,
      "name": "invalidJump",
      "msg": "Jump height must be strictly greater than current tip"
    },
    {
      "code": 6028,
      "name": "networkNotAllowed",
      "msg": "Network ID not allowed for this action"
    },
    {
      "code": 6029,
      "name": "networkAddressNotAllowed",
      "msg": "Network Address must be empty for Network ID 0"
    },
    {
      "code": 6030,
      "name": "userBitcoinProgramNotAllowed",
      "msg": "User Bitcoin Program is not allowed when routing to an external network"
    },
    {
      "code": 6031,
      "name": "incorrectNetwork",
      "msg": "Incorrect Network Configuration"
    },
    {
      "code": 6032,
      "name": "invalidTrackerAccount",
      "msg": "Invalid Tracker Account Provided"
    },
    {
      "code": 6033,
      "name": "pendingProofsExist",
      "msg": "Pending proofs exist for the previous block"
    },
    {
      "code": 6034,
      "name": "invalidAnchorHeight",
      "msg": "Invalid Anchor Height provided"
    },
    {
      "code": 6035,
      "name": "insufficientLiquidity",
      "msg": "Insufficient unreserved liquidity in escrow vault"
    },
    {
      "code": 6036,
      "name": "programAlreadyUsed",
      "msg": "Program already used for another conversion"
    },
    {
      "code": 6037,
      "name": "invalidProgramHash",
      "msg": "Provided program hash does not match the program bytes"
    }
  ],
  "types": [
    {
      "name": "conversion",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "txId",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "isNativeToBitcoin",
            "type": "bool"
          },
          {
            "name": "userProgram",
            "type": "bytes"
          },
          {
            "name": "ipowReceiveProgram",
            "type": "bytes"
          },
          {
            "name": "networkAddress",
            "type": "bytes"
          },
          {
            "name": "networkId",
            "type": "u64"
          },
          {
            "name": "nativeAmount",
            "type": "u64"
          },
          {
            "name": "bitcoinAmount",
            "type": "u64"
          },
          {
            "name": "commitFee",
            "type": "u64"
          },
          {
            "name": "reservedNative",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "approvedAt",
            "type": "i64"
          },
          {
            "name": "depositedAt",
            "type": "i64"
          },
          {
            "name": "operatorDutyExpiresAt",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "conversionStatus"
              }
            }
          },
          {
            "name": "windowStarted",
            "type": "bool"
          },
          {
            "name": "windowStartHeight",
            "type": "u64"
          },
          {
            "name": "epochStartHeight",
            "type": "u64"
          },
          {
            "name": "proofVerified",
            "type": "bool"
          },
          {
            "name": "proofTxidLe",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "proofBlockHeight",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "conversionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "none"
          },
          {
            "name": "committed"
          },
          {
            "name": "approved"
          },
          {
            "name": "deposited"
          },
          {
            "name": "completed"
          },
          {
            "name": "refunded"
          }
        ]
      }
    },
    {
      "name": "globalHeader",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "height",
            "type": "u64"
          },
          {
            "name": "hashLe",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "prevHashLe",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "merkleRootLe",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nBits",
            "type": "u32"
          },
          {
            "name": "timestamp",
            "type": "u32"
          },
          {
            "name": "arrivalTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "globalState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "operator",
            "type": "pubkey"
          },
          {
            "name": "commitFeeBps",
            "type": "u16"
          },
          {
            "name": "nextTxId",
            "type": "u64"
          },
          {
            "name": "globalTipHeight",
            "type": "u64"
          },
          {
            "name": "minAnchorHeight",
            "type": "u64"
          },
          {
            "name": "activeOpenConversions",
            "type": "u64"
          },
          {
            "name": "totalHeldCommitFees",
            "type": "u64"
          },
          {
            "name": "totalLockedDeposits",
            "type": "u64"
          },
          {
            "name": "totalReservedNative",
            "type": "u64"
          },
          {
            "name": "escrowBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "heightTracker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "count",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "proofCache",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "txId",
            "type": "u64"
          },
          {
            "name": "isSet",
            "type": "bool"
          },
          {
            "name": "isVerified",
            "type": "bool"
          },
          {
            "name": "isInvalid",
            "type": "bool"
          },
          {
            "name": "attempts",
            "type": "u8"
          },
          {
            "name": "txidLe",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "proofBlockHeight",
            "type": "u64"
          },
          {
            "name": "branchLe",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "merkleIndex",
            "type": "u64"
          },
          {
            "name": "outValueSats",
            "type": "u64"
          },
          {
            "name": "outProgram",
            "type": "bytes"
          },
          {
            "name": "outSet",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "supportedNetwork",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "networkId",
            "type": "u64"
          },
          {
            "name": "minAddrLen",
            "type": "u16"
          },
          {
            "name": "maxAddrLen",
            "type": "u16"
          },
          {
            "name": "isActive",
            "type": "bool"
          }
        ]
      }
    }
  ]
};

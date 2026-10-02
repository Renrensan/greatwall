/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/paradapp_beta.json`.
 */
export type ParadappBeta = {
  "address": "BsNd5RBHnN5mL86CwvmFHaH7MjpNgMXF6T9LjYgRFLF8",
  "metadata": {
    "name": "paradappBeta",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimFees",
      "discriminator": [
        82,
        251,
        233,
        156,
        12,
        52,
        184,
        202
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "epochState"
          ]
        },
        {
          "name": "epochState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  112,
                  111,
                  99,
                  104,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101,
                  95,
                  118,
                  48
                ]
              }
            ]
          }
        },
        {
          "name": "vaultCbbtc",
          "writable": true
        },
        {
          "name": "vaultVt",
          "writable": true
        },
        {
          "name": "vaultSpy",
          "writable": true
        },
        {
          "name": "vaultQqq",
          "writable": true
        },
        {
          "name": "vaultIemg",
          "writable": true
        },
        {
          "name": "vaultGld",
          "writable": true
        },
        {
          "name": "vaultUsdc",
          "writable": true
        },
        {
          "name": "adminCbbtc",
          "writable": true
        },
        {
          "name": "adminVt",
          "writable": true
        },
        {
          "name": "adminSpy",
          "writable": true
        },
        {
          "name": "adminQqq",
          "writable": true
        },
        {
          "name": "adminIemg",
          "writable": true
        },
        {
          "name": "adminGld",
          "writable": true
        },
        {
          "name": "adminUsdc",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
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
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "epochState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  112,
                  111,
                  99,
                  104,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101,
                  95,
                  118,
                  48
                ]
              }
            ]
          }
        },
        {
          "name": "betaMint"
        },
        {
          "name": "vaultCbbtc"
        },
        {
          "name": "vaultVt"
        },
        {
          "name": "vaultSpy"
        },
        {
          "name": "vaultQqq"
        },
        {
          "name": "vaultIemg"
        },
        {
          "name": "vaultGld"
        },
        {
          "name": "vaultUsdc"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "initialFeeBps",
          "type": "u16"
        },
        {
          "name": "mints",
          "type": {
            "array": [
              "pubkey",
              7
            ]
          }
        },
        {
          "name": "feedIds",
          "type": {
            "array": [
              {
                "array": [
                  "u8",
                  32
                ]
              },
              7
            ]
          }
        }
      ]
    },
    {
      "name": "mintBeta",
      "discriminator": [
        250,
        121,
        234,
        77,
        14,
        193,
        106,
        225
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "epochState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  112,
                  111,
                  99,
                  104,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101,
                  95,
                  118,
                  48
                ]
              }
            ]
          }
        },
        {
          "name": "betaMint",
          "writable": true
        },
        {
          "name": "userBeta",
          "writable": true
        },
        {
          "name": "userCbbtc",
          "writable": true
        },
        {
          "name": "userVt",
          "writable": true
        },
        {
          "name": "userSpy",
          "writable": true
        },
        {
          "name": "userQqq",
          "writable": true
        },
        {
          "name": "userIemg",
          "writable": true
        },
        {
          "name": "userGld",
          "writable": true
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "vaultCbbtc",
          "writable": true
        },
        {
          "name": "vaultVt",
          "writable": true
        },
        {
          "name": "vaultSpy",
          "writable": true
        },
        {
          "name": "vaultQqq",
          "writable": true
        },
        {
          "name": "vaultIemg",
          "writable": true
        },
        {
          "name": "vaultGld",
          "writable": true
        },
        {
          "name": "vaultUsdc",
          "writable": true
        },
        {
          "name": "oracleCbbtc"
        },
        {
          "name": "oracleVt"
        },
        {
          "name": "oracleSpy"
        },
        {
          "name": "oracleQqq"
        },
        {
          "name": "oracleIemg"
        },
        {
          "name": "oracleGld"
        },
        {
          "name": "oracleUsdc"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "minBetaOut",
          "type": "u64"
        },
        {
          "name": "depositAmounts",
          "type": {
            "array": [
              "u64",
              7
            ]
          }
        }
      ]
    },
    {
      "name": "redeemBeta",
      "discriminator": [
        135,
        203,
        115,
        207,
        190,
        196,
        131,
        92
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "epochState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  112,
                  111,
                  99,
                  104,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101,
                  95,
                  118,
                  48
                ]
              }
            ]
          }
        },
        {
          "name": "betaMint",
          "writable": true
        },
        {
          "name": "userBeta",
          "writable": true
        },
        {
          "name": "userCbbtc",
          "writable": true
        },
        {
          "name": "userVt",
          "writable": true
        },
        {
          "name": "userSpy",
          "writable": true
        },
        {
          "name": "userQqq",
          "writable": true
        },
        {
          "name": "userIemg",
          "writable": true
        },
        {
          "name": "userGld",
          "writable": true
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "vaultCbbtc",
          "writable": true
        },
        {
          "name": "vaultVt",
          "writable": true
        },
        {
          "name": "vaultSpy",
          "writable": true
        },
        {
          "name": "vaultQqq",
          "writable": true
        },
        {
          "name": "vaultIemg",
          "writable": true
        },
        {
          "name": "vaultGld",
          "writable": true
        },
        {
          "name": "vaultUsdc",
          "writable": true
        },
        {
          "name": "oracleCbbtc"
        },
        {
          "name": "oracleVt"
        },
        {
          "name": "oracleSpy"
        },
        {
          "name": "oracleQqq"
        },
        {
          "name": "oracleIemg"
        },
        {
          "name": "oracleGld"
        },
        {
          "name": "oracleUsdc"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "token2022Program",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "betaAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateFee",
      "discriminator": [
        232,
        253,
        195,
        247,
        148,
        212,
        73,
        222
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "epochState"
          ]
        },
        {
          "name": "epochState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  112,
                  111,
                  99,
                  104,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101,
                  95,
                  118,
                  48
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newFeeBps",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "epochState",
      "discriminator": [
        191,
        63,
        139,
        237,
        144,
        12,
        223,
        210
      ]
    },
    {
      "name": "priceUpdateV2",
      "discriminator": [
        34,
        241,
        35,
        99,
        157,
        126,
        244,
        205
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "staleOracle",
      "msg": "Oracle price is anomalous"
    },
    {
      "code": 6001,
      "name": "invalidOracle",
      "msg": "Invalid oracle account"
    },
    {
      "code": 6002,
      "name": "invalidPrice",
      "msg": "Invalid price"
    },
    {
      "code": 6003,
      "name": "zeroDeposit",
      "msg": "Zero deposit"
    },
    {
      "code": 6004,
      "name": "feeTooHigh",
      "msg": "Fee too high, max 100 bps"
    },
    {
      "code": 6005,
      "name": "emptyVault",
      "msg": "Vault is empty"
    },
    {
      "code": 6006,
      "name": "insufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6007,
      "name": "invalidComposition",
      "msg": "Invalid basket composition"
    },
    {
      "code": 6008,
      "name": "slippageExceeded",
      "msg": "Slippage exceeded"
    },
    {
      "code": 6009,
      "name": "invalidTreasuryOwner",
      "msg": "Invalid treasury owner"
    },
    {
      "code": 6010,
      "name": "invalidFeeVaultOwner",
      "msg": "Invalid fee vault owner"
    },
    {
      "code": 6011,
      "name": "unsafeOracleConfidence",
      "msg": "Oracle uncertainty (confidence) is too high"
    },
    {
      "code": 6012,
      "name": "amountTooSmall",
      "msg": "Amount is below minimum threshold to prevent dust"
    }
  ],
  "types": [
    {
      "name": "epochState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "betaMint",
            "type": "pubkey"
          },
          {
            "name": "mintCbbtc",
            "type": "pubkey"
          },
          {
            "name": "mintVt",
            "type": "pubkey"
          },
          {
            "name": "mintSpy",
            "type": "pubkey"
          },
          {
            "name": "mintQqq",
            "type": "pubkey"
          },
          {
            "name": "mintIemg",
            "type": "pubkey"
          },
          {
            "name": "mintGld",
            "type": "pubkey"
          },
          {
            "name": "mintUsdc",
            "type": "pubkey"
          },
          {
            "name": "feedCbbtc",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "feedVt",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "feedSpy",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "feedQqq",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "feedIemg",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "feedGld",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "feedUsdc",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "vaultCbbtc",
            "type": "pubkey"
          },
          {
            "name": "vaultVt",
            "type": "pubkey"
          },
          {
            "name": "vaultSpy",
            "type": "pubkey"
          },
          {
            "name": "vaultQqq",
            "type": "pubkey"
          },
          {
            "name": "vaultIemg",
            "type": "pubkey"
          },
          {
            "name": "vaultGld",
            "type": "pubkey"
          },
          {
            "name": "vaultUsdc",
            "type": "pubkey"
          },
          {
            "name": "feeBasisPoints",
            "type": "u16"
          },
          {
            "name": "weightCbbtc",
            "type": "u16"
          },
          {
            "name": "weightVt",
            "type": "u16"
          },
          {
            "name": "weightSpy",
            "type": "u16"
          },
          {
            "name": "weightQqq",
            "type": "u16"
          },
          {
            "name": "weightIemg",
            "type": "u16"
          },
          {
            "name": "weightGld",
            "type": "u16"
          },
          {
            "name": "weightUsdc",
            "type": "u16"
          },
          {
            "name": "feeCbbtc",
            "type": "u64"
          },
          {
            "name": "feeVt",
            "type": "u64"
          },
          {
            "name": "feeSpy",
            "type": "u64"
          },
          {
            "name": "feeQqq",
            "type": "u64"
          },
          {
            "name": "feeIemg",
            "type": "u64"
          },
          {
            "name": "feeGld",
            "type": "u64"
          },
          {
            "name": "feeUsdc",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "priceFeedMessage",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feedId",
            "docs": [
              "`FeedId` but avoid the type alias because of compatibility issues with Anchor's `idl-build` feature."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "price",
            "type": "i64"
          },
          {
            "name": "conf",
            "type": "u64"
          },
          {
            "name": "exponent",
            "type": "i32"
          },
          {
            "name": "publishTime",
            "docs": [
              "The timestamp of this price update in seconds"
            ],
            "type": "i64"
          },
          {
            "name": "prevPublishTime",
            "docs": [
              "The timestamp of the previous price update. This field is intended to allow users to",
              "identify the single unique price update for any moment in time:",
              "for any time t, the unique update is the one such that prev_publish_time < t <= publish_time.",
              "",
              "Note that there may not be such an update while we are migrating to the new message-sending logic,",
              "as some price updates on pythnet may not be sent to other chains (because the message-sending",
              "logic may not have triggered). We can solve this problem by making the message-sending mandatory",
              "(which we can do once publishers have migrated over).",
              "",
              "Additionally, this field may be equal to publish_time if the message is sent on a slot where",
              "where the aggregation was unsuccesful. This problem will go away once all publishers have",
              "migrated over to a recent version of pyth-agent."
            ],
            "type": "i64"
          },
          {
            "name": "emaPrice",
            "type": "i64"
          },
          {
            "name": "emaConf",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "priceUpdateV2",
      "docs": [
        "A price update account. This account is used by the Pyth Receiver program to store a verified price update from a Pyth price feed.",
        "It contains:",
        "- `write_authority`: The write authority for this account. This authority can close this account to reclaim rent or update the account to contain a different price update.",
        "- `verification_level`: The [`VerificationLevel`] of this price update. This represents how many Wormhole guardian signatures have been verified for this price update.",
        "- `price_message`: The actual price update.",
        "- `posted_slot`: The slot at which this price update was posted."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "writeAuthority",
            "type": "pubkey"
          },
          {
            "name": "verificationLevel",
            "type": {
              "defined": {
                "name": "verificationLevel"
              }
            }
          },
          {
            "name": "priceMessage",
            "type": {
              "defined": {
                "name": "priceFeedMessage"
              }
            }
          },
          {
            "name": "postedSlot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "verificationLevel",
      "docs": [
        "Pyth price updates are bridged to all blockchains via Wormhole.",
        "Using the price updates on another chain requires verifying the signatures of the Wormhole guardians.",
        "The usual process is to check the signatures for two thirds of the total number of guardians, but this can be cumbersome on Solana because of the transaction size limits,",
        "so we also allow for partial verification.",
        "",
        "This enum represents how much a price update has been verified:",
        "- If `Full`, we have verified the signatures for two thirds of the current guardians.",
        "- If `Partial`, only `num_signatures` guardian signatures have been checked.",
        "",
        "# Warning",
        "Using partially verified price updates is dangerous, as it lowers the threshold of guardians that need to collude to produce a malicious price update."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "partial",
            "fields": [
              {
                "name": "numSignatures",
                "type": "u8"
              }
            ]
          },
          {
            "name": "full"
          }
        ]
      }
    }
  ]
};

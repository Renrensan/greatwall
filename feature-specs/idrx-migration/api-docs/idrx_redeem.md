# POST /api/transaction/redeem-request

{% hint style="info" %}
Check out [this page](/introduction/supported-chain-and-contract-address.md) to see the list of chains where IDRX is available and [this page](/integration/processing-redeem-idrx-requests/redeeming-from-other-stablecoins.md) to see the list of supported other stablecoins.
{% endhint %}

{% hint style="info" %}
The balance will be processed and credited to \`**`` bankAccount` ``** max 24 hours after your request is submitted.

* Minimum transaction:
  * Redeeming IDRX is Rp20,000 IDR
  * Redeeming other stablecoins are $2 USD
* Maximum transaction:
  * Redeeming IDRX is 1,000,000,000 IDR.
  * Redeeming other stablecoins are 5,555 USD
* For transactions more than the maximum limit, please send your request to <support@idrx.co> to be processed.
* IDRX is not responsible if a redeem error occurs due to an incorrect bank/e-wallet account number.
  {% endhint %}

## Parameters

1. **`txHash` (String):**

   This parameter is the transaction hash for the burning transaction of the token.
2. **`networkChainId` (String):**

   This parameter identifies the blockchain network on which the redemption transaction occurred.
3. **`amountTransfer` (String):**

   This parameterspecifies the amount of fiat currency that was transferred as part of the redemption process. It represents the monetary value equivalent to the redeemed stable tokens.
4. **`bankAccount` (String):**

   This parameter is the bank account number provided by the user or recipient, where the fiat funds are received after the redemption process.
5. **`bankCode` (String):**

   This parameter represents the code associated with the recipient's bank. It is used to identify the specific bank where the provided `bankAccount` is held. Please use the [**Get Methods API**](/api/transaction-api/get-api-transaction-method.md) to get a list of bank codes and bank names
6. **`bankName` (String):**

   This parameter refers to the name of the recipient's bank. Please use the [**Get Methods API**](/api/transaction-api/get-api-transaction-method.md) to get a list of bank codes and bank names
7. **`bankAccountName` (String):**

   This parameter represents the name associated with the recipient's bank account. It specifies the legal or account holder's name for the provided bank account number.
8. **`walletAddress` (String):**

   This parameter is the recipient's blockchain wallet address. While the fiat funds are sent to the bank account, this parameter provides the corresponding blockchain wallet address, allowing cross-verification and transparency.
9. **`notes` (String):**

   When redeeming to a bank account with a different account holder name than your IDRX account, please fill in this parameter to describe the reason or purpose of the transaction.

### Example Request

```
curl -X POST '<https://idrx.co/api/transaction/redeem-request>' --header 'idrx-api-key: <API_KEY>' --header 'idrx-api-sig: <signature>' --header 'idrx-api-ts': <timestamp>'
```

**Payload**

```json
{
  "txHash": "string",
  "networkChainId": "string",
  "amountTransfer": "string",
  "bankAccount": "string",
  "bankCode": "string",
  "bankName": "string",
  "bankAccountName": "string",
  "walletAddress": "string",
  "notes": "string"
}
```

## Response

If the request is successful, the response will be as shown below:

```json
{
  "statusCode": 201,
  "message": "success",
  "data": {
    "id": 14,
    "chainId": 80001,
    "userId": 3,
    "requester": "Test Account",
    "txHash": "0xd946812e2b0fd4796f9deceb278e37ee4d5a456f7a39c0fff05744d2956543a9",
    "fromAddress": "string",
    "amount": "100000",
    "bankName": "BANK CENTRAL ASIA",
    "bankCode": "014",
    "bankAccountNumber": "8760673566",
    "bankAccountName": "Test Account",
    "custRefNumber": "000000169595",
    "disburseId": 205337,
    "burnStatus": "REQUESTED",
    "createdAt": "2023-04-05T00:35:45.374Z",
    "updatedAt": "2023-04-05T00:35:45.374Z",
    "deleted": false
  }
}
```

## Retrying safely

Each burn transaction can only be redeemed once. If you submit a `txHash` that has already been redeemed, the request does **not** fail and does not create a second redeem — it returns `200` with a different shape:

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "alreadyExists": true,
    "redeemRequestId": 14
  }
}
```

This makes retries safe: if a request times out and you are unsure whether it went through, resubmit the same `txHash`. Check for `data.alreadyExists` to tell a fresh redeem (`201`) from a replay (`200`), and use `redeemRequestId` to look up the original.

To check the status of your transaction, you can use the [Transaction History API](/api/transaction-api/get-api-transaction-user-transaction-history.md).

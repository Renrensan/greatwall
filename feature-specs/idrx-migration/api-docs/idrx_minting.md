# POST /transaction/mint-request

{% hint style="info" %}
Check out [this page](/introduction/supported-chain-and-contract-address.md) to see the list of chains where IDRX is available and [this page](/integration/processing-mint-idrx-requests/getting-other-stablecoins.md) to see the list of supported other stablecoins.
{% endhint %}

{% hint style="info" %}

* The balance will be processed and credited to \`**`` destinationWalletAddress` ``** max 24 hours after your request is submitted.
* Minimum transaction:
  * Minting IDRX is Rp20,000 IDR
  * Minting other stablecoins are $2 USD
* Maximum transaction:
  * Minting IDRX is 1,000,000,000 IDR.
  * Minting other stablecoins are 5,555 USD
* For transactions more than the maximum limit, please send your request to <support@idrx.co> to be processed.
* The transaction will be automatically canceled if you have not made a payment within 24 hours.
* IDRX is not responsible for deposit errors from incorrect Virtual Account numbers. Refunds for payments made to Virtual Account numbers under a different name will be processed within 14 business days.
  {% endhint %}

```
POST https://api.idrx.co/transaction/mint-request
```

### Quick start

```bash
curl -X POST 'https://api.idrx.co/transaction/mint-request' \
  -H 'idrx-api-key: <API_KEY>' \
  -H 'idrx-api-sig: <SIGNATURE>' \
  -H 'idrx-api-ts: <TIMESTAMP>' \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: my-app/1.0' \
  -d '{
    "toBeMinted": "20000",
    "destinationWalletAddress": "0x7D1398C397C64368B7079bD5b3EE904aaaf8A495",
    "networkChainId": "8453",
    "returnUrl": "https://your-app.example.com/callback",
    "requestType": "idrx"
  }'
```

Redirect the user to `data.paymentUrl` from the response. After payment, IDRX is delivered to the wallet — usually within minutes.

> For end-to-end integration including status tracking and reconciliation, see [Processing Mint IDRX Requests](/integration/processing-mint-idrx-requests.md#overview).

***

### Authentication

Every request needs four headers:

| Header         | Value                                     |
| -------------- | ----------------------------------------- |
| `idrx-api-key` | Your API key                              |
| `idrx-api-sig` | HMAC-SHA256 signature (see formula below) |
| `idrx-api-ts`  | Unix timestamp in milliseconds            |
| `User-Agent`   | Custom string like `my-app/1.0` (why)     |

#### Signature formula

```
HMAC-SHA256(secret, METHOD + ":" + PATH + ":" + SHA256(body) + ":" + timestamp)
```

For GET requests with no body, use `SHA256("")`.

Full guide: [Generating a Signature](/api/generating-a-signature.md)

API keys are issued via:

```http
POST /auth/generate-api-key
```

{% hint style="warning" %}
**Custom `User-Agent` required.** Defaults from `curl`, `Python-urllib`, or generic SDK strings are blocked at the edge with HTTP `403` (Cloudflare error 1010).
{% endhint %}

***

### Parameters

| Parameter                  | Type   | Required | Description                                                                                                                                                                                              |
| -------------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toBeMinted`               | string | ✓        | Amount to mint. Min 20,000 IDR or 2 USD. Max 1,000,000,000 IDR or 5,555 USD. Must be a whole number on Polygon and BNB Chain, and may carry at most 2 decimals on the other chains — see the note below. |
| `destinationWalletAddress` | string | ✓        | Recipient wallet on the target chain.                                                                                                                                                                    |
| `networkChainId`           | string | ✓        | Target chain ID. Supported chains →                                                                                                                                                                      |
| `returnUrl`                | string | Flow A   | HTTPS URL the customer returns to after checkout. Required for Flow A. Not used in Flow B — there is no hosted page to return from, so you may omit it.                                                  |
| `requestType`              | string | —        | `"idrx"` (default) or `"usdt"`. Other tokens →                                                                                                                                                           |
| `usdtRequested`            | string | —        | Required when `requestType` is `"usdt"`. Amount of the target stablecoin the customer expects to receive.                                                                                                |
| `expiryPeriod`             | number | —        | Payment window in minutes. Default `120`.                                                                                                                                                                |
| `productDetails`           | string | —        | Custom note on payment page. Max 255 chars.                                                                                                                                                              |
| `paymentMethod`            | string | Flow B   | `"va"`. Sending it selects Flow B: the response carries the Virtual Account number directly and no hosted checkout page is created. Requires `channelId`. Omit it for Flow A.                            |
| `channelId`                | string | —        | Required whenever `paymentMethod` is set. The bank channel — `"MANDIRI"` or `"BRI"`.                                                                                                                     |

***

### Choosing a flow

|                              | Send                          | You get back                             | Customer experience                                              |
| ---------------------------- | ----------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| **Flow A — Hosted checkout** | No `paymentMethod`            | `checkoutUrl` (mirrored as `paymentUrl`) | Redirected to a payment page where they pick a method themselves |
| **Flow B — Direct payment**  | `paymentMethod` + `channelId` | The Virtual Account number               | Stays inside your app; you show the VA number yourself           |

***

### Flow A — Hosted checkout

#### Request

```json
{
  "toBeMinted": "20000",
  "destinationWalletAddress": "0x7D1398C397C64368B7079bD5b3EE904aaaf8A495",
  "networkChainId": "8453",
  "returnUrl": "https://your-app.example.com/callback",
  "expiryPeriod": 60,
  "requestType": "idrx"
}
```

#### Response

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": 1234,
    "merchantOrderId": "20260728130000",
    "reference": "SNAP-20260728130000",
    "checkoutUrl": "https://checkout.idrx.co?token=eyJhbGciOi...",
    "paymentUrl": "https://checkout.idrx.co?token=eyJhbGciOi..."
  }
}
```

***

### Flow B — Direct payment

#### Request

```json
{
  "toBeMinted": "20000",
  "destinationWalletAddress": "0x7D1398C397C64368B7079bD5b3EE904aaaf8A495",
  "networkChainId": "8453",
  "requestType": "idrx",
  "expiryPeriod": 60,
  "paymentMethod": "va",
  "channelId": "MANDIRI"
}
```

#### Response

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": 1234,
    "merchantOrderId": "20260728130000",
    "reference": "SNAP-20260728130000",
    "checkoutUrl": "https://checkout.idrx.co?token=eyJhbGciOi...",
    "paymentUrl": "https://checkout.idrx.co?token=eyJhbGciOi...",
    "paymentMethod": "va",
    "virtualAccountNo": "8680770000001234",
    "virtualAccountName": "JOHN SMITH",
    "amount": 24000,
    "baseAmount": 20000,
    "fees": [
      { "name": "VA Mandiri", "amount": 4000 }
    ],
    "expiredDate": "2026-07-28T14:00:00.000Z"
  }
}
```

***

### Confirming payment

A transaction has two status fields you must track together:

| Field            | Tracks                                   |
| ---------------- | ---------------------------------------- |
| `paymentStatus`  | The fiat payment (VA or hosted checkout) |
| `userMintStatus` | The on-chain token delivery              |

#### Success state

```
paymentStatus: PAID
userMintStatus: MINTED
```

#### Terminal states

* `MINTED`
* `REFUND`
* `REJECTED`
* `paymentStatus: EXPIRED`

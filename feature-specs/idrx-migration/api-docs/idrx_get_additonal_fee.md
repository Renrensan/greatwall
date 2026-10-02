# GET /api/transaction/get-additional-fees

{% hint style="info" %}

* Additional fees apply for redeeming token
  * Redeeming token worth of ≤ Rp250,000,000 IDR
    1. Fee: Rp5,000
    2. Processing: Real-time
  * Redeeming token worth of > Rp250,000,000 IDR and < Rp1,000,000,000 IDR
    1. Fee: Rp35,000&#x20;
    2. Processing: Only during office hours (Monday–Friday, 08:00–15:00 WIB)
       {% endhint %}

## Parameters

1. **`feeType` (String):**

   The type of the transaction fee. Possible values are 'MINT', 'REDEEM', 'REFUND'.
2. **chainId (String):**\
   Blockchain ID.

## Example Request

```
curl '<https://idrx.co/api/transaction/get-additional-fees?feeType=REDEEM>' --header 'idrx-api-key: <API_KEY>' --header 'idrx-api-sig: <signature>' --header 'idrx-api-ts': <timestamp>'
```

## Response

If the request is successful, the response will be as shown below:

```json
{
    "statusCode": 200,
    "message": "success",
    "data": [
        {
            "id": 1,
            "name": "Payment Gateway Fee",
            "amount": "3000",
            "isActive": true,
            "deleted": false
        }
    ]
}
```

`isActive` indicates if the fee is currently active and should be calculated in the transaction.

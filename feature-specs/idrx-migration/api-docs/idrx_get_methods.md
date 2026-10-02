# GET /api/transaction/method

## Example Request

```
curl -X GET '<https://idrx.co/api/transaction/method>' --header 'idrx-api-key: <API_KEY>' --header 'idrx-api-sig: <signature>' --header 'idrx-api-ts': <timestamp>'
```

## Response

If the request is successful, the response will be as shown below:

```json
{
  "statusCode": 200,
  "message": "success",
  "data": [
    {
      "bankCode": "014",
      "bankName": "BANK CENTRAL ASIA",
      "maxAmountTransfer": "100000000"
    },
    {
      "bankCode": "002",
      "bankName": "BANK BRI",
      "maxAmountTransfer": "100000000"
    },
    {
      "bankCode": "200",
      "bankName": "BANK  BTN",
      "maxAmountTransfer": "50000000"
    }
    ...
  ]
}
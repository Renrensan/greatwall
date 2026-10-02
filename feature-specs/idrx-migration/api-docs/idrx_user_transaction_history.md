# GET /api/transaction/user-transaction-history

## Parameters

1. **`transactionType` (String)&#x20;**<mark style="color:red;">**Required**</mark>**: (MINT, BURN, BRIDGE, DEPOSIT\_REDEEM)**

   This parameter is for selecting the type of transaction.
2. **`userMintStatus`(String):** &#x20;

* NOT\_AVAILABLE : Transaction is waiting for the payment to be finished
* PROCESSING : Minting is being processed
* MINTED : Transaction is minted
* FAILED: Transaction is failed
* REJECTED: Transaction is rejected
* REFUND: Transaction is refunded

3. **`paymentStatus` (String):**&#x20;

* PAID : Transaction is paid
* WAITING\_FOR\_PAYMENT: Transaction is waiting for payment
* EXPIRED: The payment request is expired

4. **`burnStatus` (String):**&#x20;

* REQUESTED: Transaction has been requested
* IN\_PROCESS: Transaction is being processed
* SUCCESS: Redeem transaction is successful
* FAILED: Redeem transaction is failed

5. **`bridgeStatus` (String):**&#x20;

* REQUESTED: Transaction has been requested
* PROCESSING: Transaction is being processed
* SUCCESS: Bridge transaction is successful
* FAILED: Bridge transaction is failed

6. **`merchantOrderId`(String):**

   This parameter filters the transaction based on the merchant order ID.
7. **`originChainId`(Number):**

   This parameter filters the transaction based on the origin chain ID.&#x20;
8. **`destinationChainId` (Number):**

   This parameter filters the transaction based on the target chain ID.&#x20;
9. **`amountMax`(String):**

   This parameter filters the transaction based on the maximum IDRX amount transacted.
10. **`amountMin`(String):**

    This parameter filters the transaction based on the minimum IDRX amount transacted.
11. **`txHash`(String):**

    This parameter filters the transaction based on the transaction hash.
12. **`orderByDate`(String):**

    This parameter filters the date in an ascending (**ASC**) or descending (**DESC**) order.
13. **`orderByAmount`(String):**

    This parameter filters the amount in an ascending (**ASC**) or descending (**DESC**) order.
14. **`page`(String)&#x20;**<mark style="color:red;">**Required**</mark>**:**

    This parameter specifies the page number of the data to be retrieved.
15. **`take`(String)&#x20;**<mark style="color:red;">**Required**</mark>**:**

    This parameter specifies the amount of data to be retrieved per page.
16. **`transferTxHash`(String):**

    For DEPOSIT\_REDEEM type, the transfer tx hash of the USDT deposit transaction.
17. **`burnTxHash`(String):**

    For DEPOSIT\_REDEEM type, the IDRX burn tx hash of the USDT deposit transaction.

## Example Request

```
curl '<https://idrx.co/api/transaction/user-transaction-history?transactionType=BRIDGE&page=1&take=10>' --header 'idrx-api-key: <API_KEY>' --header 'idrx-api-sig: <signature>' --header 'idrx-api-ts': <timestamp>'
```

## Response

If the request is successful, the response will be as shown below:

Example for transactionType MINT:

```json
{
    "statusCode": 200,
    "message": "success",
    "metadata": {
        "page": null,
        "perPage": null,
        "pageCount": null,
        "totalCount": 1
    },
    "records": [
        {
            "id": 311,
            "paymentAmount": 54500,
            "merchantOrderId": "20231219101707",
            "productDetails": "Minting IDRX",
            "customerVaName": "JOHN SMITH",
            "email": "john.smith@gmail.com;IDRX",
            "chainId": 137,
            "destinationWalletAddress": "0x8BD53F7fF88fD895D3686fe6369a07432822d30F",
            "toBeMinted": "19860",
            "merchantUserInfo": 411,
            "createdAt": "2023-12-19T10:17:07.903Z",
            "updatedAt": "2023-12-19T10:57:15.197Z",
            "paymentStatus": "PAID",
            "expiryTimestamp": "1703197027900",
            "reference": "D11808T8GVTL81VV2U7HV",
            "txHash": "0xb8a0b017d96b49813814026cd01a3ceb169b33ab01b895c222c36c241d2ad3cb",
            "qredoTxId": "2Zl4ZG8dr5tyfdSfm6aF3PrpxU4",
            "adminMintStatus": "MINTED",
            "userMintStatus": "MINTED",
            "reportStatus": "APPROVED",
            "requestType": "",
            "userId": 101,
            "refundStatus": null,
            "fee": 140,
            "paymentCode": "IQ",
            "fees": [
              { 
                "name": "Payment Method Fee (QRIS)", 
                "amount": "140" 
              }
            ]
        }
    ]
}
```

Example for transactionType MINT with requestType `usdt`:

```json
{
    "statusCode": 200,
    "message": "success",
    "metadata": {
        "page": null,
        "perPage": null,
        "pageCount": null,
        "totalCount": 1
    },
    "records": [
          {
            "id": 10,
            "paymentAmount": 22320,
            "merchantOrderId": "20231004154713",
            "productDetails": "Minting IDRX",
            "customerVaName": "JOHN SMITH",
            "email": "john.smith@gmail.com;IDRX",
            "chainId": 137,
            "destinationWalletAddress": "0x4313816F7Bfcff384053C70365eb6F3a4dbDD39f",
            "toBeMinted": "19860",
            "merchantUserInfo": 1,
            "createdAt": "2023-10-04T08:47:13.910Z",
            "updatedAt": "2023-10-04T08:51:33.692Z",
            "paymentStatus": "PAID",
            "expiryTimestamp": "1696495633902",
            "reference": "DS1507923ZZSZSKOMRNDZD23",
            "txHash": "0x575f9495e3dd0d629a732e4e4c787954368350f2dc379df7d6588654bee69526",
            "qredoTxId": "2WI9cLKJm66tsZy6jhdXOfmnJmH",
            "adminMintStatus": "MINTED",
            "userMintStatus": "MINTED",
            "isApproved": true,
            "reportStatus": "NONE",
            "requestType": "usdt",
            "userId": 101,
            "refundStatus": null,
            "usdtRequest": {
                "destinationWalletAddress": "0x8bd53f7ff88fd895d3686fe6369a07432822d30f",
                "chainId": 137,
                "transferTxHash": "0x65a8bfbcf9b6de2d6115d27033d16c8bc3220fc95f3c146a13ce92ead4a54de6",
                "usdtRequested": "1.11",
                "amountIdrx": 17320,
                "amountUsdt": "1.10975",
                "swapTxHash": "0xc9629766275e50982e6b2b12f9bb87f4ac469c036dd066899e2b2a53acd76d12",
                "status": "SUCCESS"
            },
            "fee": 140,
            "paymentCode": "IQ",
            "fees": [
              { 
                "name": "Payment Method Fee (QRIS)", 
                "amount": "140" 
              }
            ]
        }
    ]
}
```

Example for transactionType BURN:

```json
{
    "statusCode": 200,
    "message": "success",
    "metadata": {
        "page": null,
        "perPage": null,
        "pageCount": null,
        "totalCount": 1
    },
    "records": [
        {
            "id": 121,
            "userId": 411,
            "txHash": "0xa38c057222872d8e3d106ab5f9b86b7d1d6ade72d485eb01366650e45c8a65d0",
            "amount": "16000",
            "bankName": "BANK CENTRAL ASIA",
            "bankAccountNumber": "5260759037",
            "burnStatus": "SUCCESS",
            "createdAt": "2023-12-19T11:05:42.583Z",
            "updatedAt": "2023-12-19T11:33:53.865Z",
            "bankCode": "014",
            "custRefNumber": "000028881450",
            "disburseId": 17610583,
            "fromAddress": "0x8BD53F7fF88fD895D3686fe6369a07432822d30F",
            "chainId": 137,
            "requester": "JOHN SMITH",
            "bankAccountName": "WILDAN RAMADHAN               ",
            "bankAccountNumberHash": null,
            "notes": null,
            "reportStatus": "APPROVED"
        }
    ]
}
```

Example for transactionType DEPOSIT\_REDEEM:

```json
{
    "statusCode": 200,
    "message": "success",
    "metadata": {
        "page": null,
        "perPage": null,
        "pageCount": null,
        "totalCount": 1
    },
    "records": [
        {
            "id": 8,
            "address": "0x4313816f7bfcff384053c70365eb6f3a4dbdd39f",
            "transferTxHash": "0xfba5abf029e8c7a29ee71a5a92366b5e776ee10bdcdf6df69bc512dce9742f41",
            "tokenFrom": "usdt",
            "amountFrom": "112",
            "swapTxHash": "0x3ad1724f31b146eda4ba1fe90214548180919b33df9b85f510d671f6ea5d9210",
            "amountTo": "1692000",
            "burnTxHash": "0x191967dc3cd12924027762ff9f90a069394c070baf5bf37afffa44b85b42c108",
            "status": "SUCCESS",
            "createdAt": "2024-01-09T09:15:02.048Z",
            "updatedAt": "2024-01-11T09:52:48.060Z",
            "tokenTo": "idrx",
            "toAddress": "0xddb154f503ccd047555a976b01069471a0ab4068",
            "userId": 101,
            "chainId": 137,
            "requester": "JOHN SMITH",
            "bankAccountName": "JOHN SMITH",
            "bankAccountNumber": "5260759037",
            "bankAccountNumberHash": null,
            "bankCode": "014",
            "bankName": "BANK CENTRAL ASIA",
            "amountRedeem": "1687000",
            "txType": 'USDT'
        }

    ]
}
```

Example for transactionType BRIDGE:

```json
{
  "statusCode": 200,
  "message": "success",
  "metadata": {
    "page": 1,
    "perPage": 10,
    "pageCount": 1,
    "totalCount": 3
  },
  "records": [
    {
      "id": 3,
      "userId": 1,
      "bridgeFromChainId": 80001,
      "bridgeToChainId": 97,
      "txHashBurn": "0x38ef6a20db393505fbae51f5f9ec9197013cee21bccafabf8ef37261aa2039d9",
      "txHashMint": null,
      "qredoTxId": null,
      "signedTx": null,
      "bridgeNonce": "0",
      "amount": "100000",
      "bridgeStatus": "REQUESTED",
      "deleted": false
    }
  ]
}
```

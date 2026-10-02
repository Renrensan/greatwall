# POST /api/auth/onboarding

This API is used by an organization to onboard new users to the platform. Accounts registered in this way can skip a few steps of the KYC process. The organization can then use the API keys associated with these accounts to process mint and redeem requests. This endpoint accepts requests of type `multipart/form-data`.&#x20;

## Parameters

1. **`email` (String):**

   This parameter represents the email address of the user.
2. **`fullname` (String):**

   This parameter refers to the user's full name.
3. **`address` (String):**

   This parameter refers to the user's physical address.
4. **`idNumber`(String):**

   This parameter refers to the user's ID number.
5. **`idFile`(File):**\
   This parameter represents an image file of the user's ID. Accepted file types are: `jpeg, png, jpg, webp`.  File dimension should be between 256px \* 256px and 4096px \* 4096px.

## Example Request

<pre><code><strong>curl -X POST '&#x3C;https://idrx.co/api/auth/onboarding>' --header 'idrx-api-key: &#x3C;API_KEY>' --header 'idrx-api-sig: &#x3C;signature>' --header 'idrx-api-ts': &#x3C;timestamp>' --header 'Content-Type': multipart/form-data'
</strong></code></pre>

**Payload**

```json
{
  "email": "string",
  "fullname": "string",
  "address": "string",
  "idNumber": "string",
  "idFile": "file"
}
```

## Response

If the request is successful, the response will be as shown below:

```json
{
  statusCode: 201,
  message: 'success',
  data: {
    id: 1011,
    fullname: 'JOHN SMITH',
    createdAt: '2023-12-12T08:10:29.077Z',
    apiKey: '3d1c15c7afd157a6',
    apiSecret: '7bb0de01a2cf17c1094db789bfa05eb1adc185482c3ee828a7ba61b683e9b711'
  }
}
```

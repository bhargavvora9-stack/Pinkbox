# Razorpay Setup — PinkBox

## 1. Razorpay Dashboard

Start with **Test Mode**.

Generate an API Key ID and API Key Secret from the Razorpay Dashboard.

Create a webhook with this endpoint:

`https://pinkbox-gv7q.vercel.app/api/website/razorpay-webhook`

Enable these events:

- `payment.captured`
- `payment.failed`
- `order.paid`

Set a strong webhook secret. Keep the same secret in Vercel.

## 2. Vercel Environment Variables

Add these variables to the PinkBox Vercel project:

```
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

For the first test, use Razorpay **Test Mode** credentials. After the test is successful, replace them with the Live Mode credentials for the Production environment.

Do not commit these values to GitHub.

## 3. PinkBox payment flow

The storefront:

1. Creates the PinkBox order on the server.
2. Creates a Razorpay Order server-side using the final INR amount.
3. Opens Razorpay Checkout with the Razorpay `order_id`.
4. Verifies the returned payment signature on the server.
5. Fetches the Razorpay payment and confirms amount/currency/status.
6. Marks the PinkBox order as paid/confirmed.
7. Uses the webhook as the server-side asynchronous confirmation path.

## 4. Admin

Open:

`/admin/payments`

A Razorpay payment method can be added there, but the integration also supports Vercel environment variables directly. The Key Secret and Webhook Secret are never returned to the admin UI in plain text.

## 5. Test checklist

Place a small test order using **Online payment** and confirm:

- Razorpay Checkout opens.
- Razorpay payment succeeds in Test Mode.
- PinkBox order has a Razorpay Order ID.
- PinkBox order has a Razorpay Payment ID.
- Payment status becomes `paid`.
- Order status becomes `confirmed`.
- `payment.captured` webhook returns HTTP 200.
- Refreshing/repeating the webhook does not create a second paid state.

## 6. Security

The Razorpay API Secret stays server-side. Checkout receives only the public Key ID.

Payment signature verification uses the server-side secret, and webhook requests are verified with the webhook secret before processing.

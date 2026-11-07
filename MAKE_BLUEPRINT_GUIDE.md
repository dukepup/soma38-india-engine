# Make.com Integration & Automation Blueprint Guide

This guide details how to set up the two Make.com scenarios that orchestrate data between your **WeWeb frontend**, **Stripe payment gateway**, and the **Antigravity Backend**.

---

## Scenario 1: Free Reading Intake Pipeline

### Overview
When a user submits their self-report and details on WeWeb, this scenario calls the Antigravity backend with `payment_status: false` to generate the free diagnosis letter.

### Flow Diagram
```
[1. Custom Webhook] --> [2. Router / Filter] --> [3. HTTP (POST /api/generate-reading)] --> [4. Webhook Response]
```

### Step-by-Step Module Configuration

#### Module 1: Custom Webhook
* **Module**: Webhooks -> Custom Webhook
* **Webhook Name**: `WeWeb Reading Intake`
* **Copy Webhook URL**: Save this URL to use in WeWeb's REST API action.
* **Sample Payload structure received**:
```json
{
  "user_id": "usr_9812",
  "user_name": "Sarah",
  "self_report": "I've been feeling anxious and indecisive about switching careers...",
  "horary_timestamp_utc": "2026-08-20T11:00:00.000Z",
  "current_location": {
    "latitude": 51.5074,
    "longitude": -0.1278,
    "city": "London"
  },
  "birth_data": {
    "date": "1994-06-12",
    "time": "08:15",
    "city": "Bristol",
    "latitude": 51.4545,
    "longitude": -2.5879
  }
}
```

#### Module 2: HTTP (Make a request)
* **Module**: HTTP -> Make a request
* **URL**: `https://<YOUR_ANTIGRAVITY_BACKEND_URL>/api/generate-reading`
* **Method**: `POST`
* **Headers**:
  * `Content-Type`: `application/json`
* **Body Type**: `Raw` (JSON)
* **Request Content**:
```json
{
  "user_id": "{{1.user_id}}",
  "user_name": "{{1.user_name}}",
  "self_report": "{{1.self_report}}",
  "horary_timestamp_utc": "{{1.horary_timestamp_utc}}",
  "current_location": {
    "latitude": {{1.current_location.latitude}},
    "longitude": {{1.current_location.longitude}},
    "city": "{{1.current_location.city}}"
  },
  "birth_data": {
    "date": "{{1.birth_data.date}}",
    "time": "{{1.birth_data.time}}",
    "city": "{{1.birth_data.city}}",
    "latitude": {{1.birth_data.latitude}},
    "longitude": {{1.birth_data.longitude}}
  },
  "payment_status": false
}
```
* **Parse response**: `Yes`

#### Module 3: Webhook Response
* **Module**: Webhooks -> Webhook Response
* **Status**: `200`
* **Body**: `{{3.data}}`
* **Headers**:
  * `Content-Type`: `application/json`

---

## Scenario 2: Stripe Payment & Remedy Unlock Pipeline

### Overview
Listens for successful Stripe payments ($3.49 for 1 blend or $7.99 for 3 blends), calls the backend with `payment_status: true`, and stores or sends the complete unlocked Bach Flower remedy protocol.

### Flow Diagram
```
[1. Stripe: Watch Events] --> [2. Filter: checkout.session.completed] --> [3. HTTP: POST /api/unlock-reading] --> [4. Email / DB Update]
```

### Step-by-Step Module Configuration

#### Module 1: Stripe (Watch Events)
* **Module**: Stripe -> Watch Events
* **Event types**: `checkout.session.completed`
* **Metadata captured**:
  * `user_id`: Customer identifier
  * `user_name`: Name
  * `reading_id`: The ID of the free reading to unlock
  * `self_report`: Original input text

#### Module 2: HTTP (Unlock Reading on Antigravity Backend)
* **Module**: HTTP -> Make a request
* **URL**: `https://<YOUR_ANTIGRAVITY_BACKEND_URL>/api/unlock-reading`
* **Method**: `POST`
* **Headers**:
  * `Content-Type`: `application/json`
* **Body Type**: `Raw` (JSON)
* **Request Content**:
```json
{
  "user_id": "{{1.customer}}",
  "user_name": "{{1.customer_details.name}}",
  "self_report": "{{1.metadata.self_report}}",
  "horary_timestamp_utc": "{{1.metadata.horary_timestamp_utc}}",
  "current_location": {
    "city": "{{1.metadata.city}}"
  },
  "payment_status": true
}
```

#### Module 3: Send Confirmation & Unlocked Protocol (Email / Airtable / Supabase)
* **Module**: SendGrid / Gmail / Supabase
* **Recipient**: `{{1.customer_details.email}}`
* **Subject**: `Your Personal Bach Flower Formula & Astrological Letter`
* **Content**: `{{2.data.letter}}`

# WeWeb Frontend Implementation Guide

This guide walks through configuring your **WeWeb** no-code web app to capture user inputs, automatically timestamp and geolocate for the Horary chart, display the personal Boron Letters diagnosis, and trigger the Stripe paywall.

---

## 1. Page Layout & Component Architecture

### View 1: Intake & Reflection Form (Warm & Conversational)
* **Heading**: "A Quiet Space for Reflection"
* **Subheading**: "Share what is on your mind and where you are feeling friction in your day-to-day life."
* **Elements**:
  1. **Text Area (`input_self_report`)**:
     * Placeholder: *"Tell me a bit about what's going on right now—where do you feel that friction, or what's the question that's been heavy on your mind lately?"*
  2. **Collapsible Container (`optional_birth_details`)**:
     * Title: *"Optional: Add Birth Chart Details (Enhances the reading)"*
     * Date Picker (`birth_date`)
     * Time Picker (`birth_time`)
     * City Input (`birth_city`)
  3. **Submit Button (`btn_get_reading`)**:
     * Text: *"Read Patterns & Gain Clarity"*

---

## 2. JavaScript Actions in WeWeb Workflow

Attach a workflow to the **Submit Button (`btn_get_reading`)**:

### Step 1: Capture Browser Geolocation & UTC Timestamp
Add a **Custom JavaScript** action to grab current coordinates in the background:

```javascript
// Automatically timestamp and geolocate for Horary chart casting
const utcTimestamp = new Date().toISOString();

return new Promise((resolve) => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          horary_timestamp_utc: utcTimestamp,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        // Fallback gracefully if location permission is denied
        console.warn("Geolocation denied or unavailable:", error.message);
        resolve({
          horary_timestamp_utc: utcTimestamp,
          latitude: 51.5074, // default fallback
          longitude: -0.1278
        });
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  } else {
    resolve({
      horary_timestamp_utc: utcTimestamp,
      latitude: 51.5074,
      longitude: -0.1278
    });
  }
});
```

### Step 2: REST API Call to Make.com Webhook (or Backend directly)
Add a **REST API Request** action:
* **Method**: `POST`
* **URL**: `https://hook.eu1.make.com/<YOUR_MAKE_WEBHOOK_ID>` (or `http://localhost:3000/api/generate-reading`)
* **Headers**:
  * `Content-Type`: `application/json`
* **Body**:
```json
{
  "user_id": context.user?.id || "anon",
  "user_name": context.user?.name || "Friend",
  "self_report": variables['input_self_report'],
  "horary_timestamp_utc": steps[0].result.horary_timestamp_utc,
  "current_location": {
    "latitude": steps[0].result.latitude,
    "longitude": steps[0].result.longitude,
    "city": variables['birth_city'] || ""
  },
  "birth_data": variables['birth_date'] ? {
    "date": variables['birth_date'],
    "time": variables['birth_time'] || "12:00",
    "city": variables['birth_city'] || ""
  } : null,
  "payment_status": false
}
```

### Step 3: Store Response in WeWeb Variable
* Save the returned JSON to a page variable: `current_reading`.
* Navigate to or reveal **View 2: The Letter View**.

---

## 3. View 2: The Letter Display & Paywall

### Typography & Styling
Style this container with an intimate reading aesthetic ("The Boron Letters" feel):
* Font: Clean serif or warm sans-serif (e.g., *Lora*, *Merriweather*, or *Inter*).
* Max-width: `720px` centered.
* Generous line height: `1.75` for effortless reading.

### Displaying Dynamic Content
* **Letter Text Container**: Bind to `variables['current_reading'].letter`.
* **Paywall Card (Conditionally shown if `payment_status == false`)**:
  * Highlight Card:
    * **Headline**: *"Unlock Your Personalized Bach Flower Protocol"*
    * **Description**: *"Get the exact blend formula and actionable behavioral steps tailored to your pattern."*
    * **Option A Button ($3.49)**: Link to Stripe Checkout (Single Blend Formula)
    * **Option B Button ($7.99)**: Link to Stripe Checkout (3 Blend Formulas Package)

---

## 4. Unlocking the Reading in WeWeb
When returning from Stripe checkout (with `session_id` in URL parameters):
1. On Page Load workflow detects `session_id`.
2. Triggers `POST /api/unlock-reading` with the original self-report.
3. Automatically updates `variables['current_reading'].letter` to display the full, unlocked remedy blend!

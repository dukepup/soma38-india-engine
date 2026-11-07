const LIVE_URL = "https://antigravity-lgwq.onrender.com";

async function testLiveReading() {
  console.log(`Testing LIVE reading generation against ${LIVE_URL}/api/generate-reading ...`);

  const payload = {
    user_name: "Bernardo",
    self_report: "I've been feeling anxious and indecisive about launching my new project. I know what I need to do, but I keep second-guessing myself.",
    horary_timestamp_utc: new Date().toISOString(),
    current_location: {
      latitude: 51.5074,
      longitude: -0.1278,
      city: "London"
    },
    payment_status: false
  };

  try {
    const res = await fetch(`${LIVE_URL}/api/generate-reading`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("Live API HTTP Status:", res.status);
    const data = await res.json();
    console.log("\n=================================================");
    console.log("🎉 LIVE BACKEND RESPONSE:");
    console.log("=================================================");
    console.log("Reading ID:", data.reading_id);
    console.log("Payment Status:", data.payment_status);
    console.log("Gestalt Stage:", data.internal_metadata?.gestalt_stage);
    console.log("Letter Sample:\n");
    console.log(data.letter.substring(0, 500) + "...\n");
    console.log("=================================================");
  } catch (err) {
    console.error("Live test failed:", err.message);
  }
}

testLiveReading();

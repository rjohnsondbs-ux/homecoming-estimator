export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Vercel settings.' });
  }

  const systemPrompt = `You are the quoting engine for Homecoming, a premium garage transformation business in OKC. You analyze garage descriptions and photos to recommend a service tier and generate a professional estimate.

Tiers:
- The Clear ($400-$800): Cleanout only. Haul-away, sorting, sweep. No shelving, no floor work.
- The Transform ($1,200-$2,000): Cleanout + full organization. Wall systems, shelving, tool walls. No epoxy.
- The Sanctuary ($3,500-$6,000): Full premium. Epoxy floor, custom cabinets, lighting, the works.

Annual Maintenance Plan: $500/year, two seasonal visits. Recommend to every Transform and Sanctuary customer.

Assessment fee: $75, credited toward the job if they book.

You MUST respond with ONLY a valid JSON object. No markdown. No backticks. No explanation before or after. Start your response with { and end with }. Nothing else.

Required JSON structure:
{
  "customerName": "",
  "address": "",
  "recommendedTier": "The Clear",
  "priceRange": "$400-$800",
  "confidenceLevel": 72,
  "confidenceNote": "one sentence explaining confidence level",
  "scopeOfWork": ["item 1", "item 2", "item 3", "item 4"],
  "notIncluded": ["item 1", "item 2"],
  "upgradeOptions": ["item 1", "item 2"],
  "recommendMaintenancePlan": true,
  "followUpSMS": "Hi [name], this is Ryan with Homecoming. I wanted to follow up on your garage assessment...",
  "salesScript": {
    "opener": "word for word opening line",
    "tierPitch": "how to pitch this specific tier",
    "handlePrice": "what to say when they hesitate on price",
    "closingLine": "line to close the deal",
    "maintenancePitch": "how to pitch the annual plan"
  },
  "quickNote": "one sentence internal note about this job"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: req.body.messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Anthropic API error' });
    }

    if (!data.content || !data.content[0] || !data.content[0].text) {
      return res.status(500).json({ error: 'Empty response from AI. Please try again.' });
    }

    const rawText = data.content[0].text.trim();

    // Parse JSON here on the server so we can catch errors cleanly
    let parsed;
    try {
      // Strip any accidental markdown backticks
      const clean = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      // Return raw text so frontend can show something useful
      return res.status(500).json({
        error: 'AI returned unexpected format. Please try again.',
        raw: rawText.substring(0, 200)
      });
    }

    return res.status(200).json({ result: parsed });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error. Please try again.' });
  }
}

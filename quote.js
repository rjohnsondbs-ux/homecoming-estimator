export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const systemPrompt = `You are the quoting engine for Homecoming, a premium garage transformation business in OKC. You analyze garage descriptions and photos to recommend a service tier and generate a professional estimate.

Tiers:
- The Clear ($400–$800): Cleanout only. Haul-away, sorting, sweep. No shelving, no floor work.
- The Transform ($1,200–$2,000): Cleanout + full organization. Wall systems, shelving, tool walls. No epoxy.
- The Sanctuary ($3,500–$6,000): Full premium. Epoxy floor, custom cabinets, lighting, the works.

Annual Maintenance Plan: $500/year, two seasonal visits. Recommend to every Transform and Sanctuary customer.

Assessment fee: $75, credited toward the job if they book.

Respond ONLY with valid JSON, no markdown, no backticks, no preamble. Use this exact structure:
{
  "customerName": "string or empty",
  "address": "string or empty",
  "recommendedTier": "The Clear or The Transform or The Sanctuary",
  "priceRange": "e.g. $1,200–$2,000",
  "confidenceLevel": 72,
  "confidenceNote": "one sentence explaining confidence level",
  "scopeOfWork": ["item 1", "item 2", "item 3", "item 4", "item 5"],
  "notIncluded": ["item 1", "item 2"],
  "upgradeOptions": ["item 1", "item 2"],
  "recommendMaintenancePlan": true,
  "followUpSMS": "The text message to send the customer. 2-3 sentences. Warm and professional. Mentions the specific job and price range and next step.",
  "salesScript": {
    "opener": "Word-for-word opening line when you arrive at the assessment",
    "tierPitch": "How to pitch the recommended tier specifically for this job",
    "handlePrice": "What to say when they hesitate on price",
    "closingLine": "The line to close the deal",
    "maintenancePitch": "How to pitch the $500/year annual plan before leaving"
  },
  "quickNote": "One-sentence internal note about this specific job"
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
        max_tokens: 1500,
        system: systemPrompt,
        messages: req.body.messages
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Something went wrong' });
  }
}

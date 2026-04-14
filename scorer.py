import json
import os

from openai import AsyncOpenAI

# ---------------------------------------------------------------------------
# Dorothy's ground truth — never exposed during the call; used only for
# the post-call GPT-4o scoring prompt.
# ---------------------------------------------------------------------------
_SCORING_PROMPT = """You are an expert Medicare agent trainer scoring a training call.
The agent was taking an inbound call from a simulated Medicare beneficiary.
The agent did NOT know anything about the caller in advance.
Score the AGENT only — not the caller.

Here is the complete call transcript:
{transcript}

Here is what the caller (Dorothy Miller) actually knows about herself:
- Name: Dorothy Miller, Age 72, DOB Sept 4 1952
- Address: 847 Willow Creek Drive, Anna TX 75409
- Phone: (469) 555-0317
- Medicare ID: 2HJ7-RF4-NP61
- Current Plan: UHC Medicare Advantage, Plan ID UHC-MA-TX-0047
- PCP: Dr. Robert Chen, North Texas Family Clinic, Anna TX
- Medications: Lisinopril 10mg once daily, Metformin 500mg twice daily (only these)
- Reason calling: Saw ~$900 grocery benefit card online, wants to know if it's real
- Priority 1: Grocery/food benefit card
- Priority 2: Lower Rx copays (Metformin feels expensive)
- Priority 3: Dental coverage (hasn't been in 2 years)
- LIS/Extra Help: No
- Pharmacy: CVS Anna TX

Score the agent on these 7 dimensions. For each dimension, provide:
  - score: integer 0-100
  - what_agent_did: one sentence describing what the agent actually did
  - what_was_missed: specific things the agent failed to uncover or do
  - perfect_response: exactly what an expert agent should have said or done

Dimensions:
1. discovery_identity
   Did agent ask for and correctly capture: name, DOB or age, address, phone, Medicare ID?
   Did they avoid asking for SSN? Did they use the information to verify identity properly?

2. discovery_situation
   Did agent ask what plan the caller is currently on?
   Did agent ask about current doctors and whether they want to keep them?
   Did agent ask about current medications and pharmacy?
   Did agent ask about current premium and coverage satisfaction?

3. needs_identification
   Did agent uncover the caller's PRIMARY reason for calling (grocery card)?
   Did agent probe to find the 2 secondary needs (copays, dental)?
   Did agent ask open-ended questions like "Is there anything else about your current coverage
   that isn't working for you?" or "What's most important to you in a plan?"

4. product_knowledge
   Did agent correctly explain whether grocery/food benefits exist in Medicare Advantage?
   Did agent accurately explain how OTC/grocery cards work under 42 CFR 422.102?
   Did agent give factually accurate information about the caller's plan or Medicare in general?
   Penalize any hallucinated or incorrect Medicare facts.

5. compliance
   Did agent introduce themselves and their company at the start?
   Did agent mention the SOA (Scope of Appointment) before discussing specific plans?
   Did agent avoid recommending a specific plan without completing full needs analysis first?
   Did agent avoid making guarantees or promises about benefits?
   Did agent avoid asking for SSN?
   Penalize any compliance violations hard.

6. communication_quality
   Did agent speak clearly and at an appropriate pace for a 72-year-old caller?
   Did agent use the caller's name?
   Did agent acknowledge the caller's emotions and concerns empathetically?
   Did agent avoid jargon without explanation?
   Did agent confirm understanding by summarizing back to the caller?

7. resolution
   Did agent give a clear, specific next step?
   Did agent offer to look up the caller's specific plan benefits?
   Did agent offer to schedule a follow-up or send information?
   Did the caller seem to have her question answered by the end?

Also provide:
  - overall_score: weighted average (discovery 30%, needs 25%, compliance 20%,
    product 10%, communication 10%, resolution 5%)
  - top_strength: one sentence — what the agent did genuinely well
  - top_improvement: one sentence — the single most important thing to fix
  - compliance_flags: array of any compliance violations found (can be empty)
  - discovery_checklist: object showing true/false for each item agent captured:
    { name, dob, address, phone, medicare_id, current_plan, doctors, medications,
      pharmacy, reason_for_call, priority_2_copays, priority_3_dental, lis_status }

Return ONLY valid JSON. No markdown. No explanation. No preamble.
{
  "discovery_identity": { "score": 0, "what_agent_did": "", "what_was_missed": "", "perfect_response": "" },
  "discovery_situation": { "score": 0, "what_agent_did": "", "what_was_missed": "", "perfect_response": "" },
  "needs_identification": { "score": 0, "what_agent_did": "", "what_was_missed": "", "perfect_response": "" },
  "product_knowledge": { "score": 0, "what_agent_did": "", "what_was_missed": "", "perfect_response": "" },
  "compliance": { "score": 0, "what_agent_did": "", "what_was_missed": "", "perfect_response": "" },
  "communication_quality": { "score": 0, "what_agent_did": "", "what_was_missed": "", "perfect_response": "" },
  "resolution": { "score": 0, "what_agent_did": "", "what_was_missed": "", "perfect_response": "" },
  "overall_score": 0,
  "top_strength": "",
  "top_improvement": "",
  "compliance_flags": [],
  "discovery_checklist": {
    "name": false,
    "dob": false,
    "address": false,
    "phone": false,
    "medicare_id": false,
    "current_plan": false,
    "doctors": false,
    "medications": false,
    "pharmacy": false,
    "reason_for_call": false,
    "priority_2_copays": false,
    "priority_3_dental": false,
    "lis_status": false
  }
}
"""


async def score_call(transcript_list: list) -> dict:
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    lines = []
    for entry in transcript_list:
        speaker = "Caller" if entry.get("speaker") == "Dorothy" else "Agent"
        text = entry.get("text", "").strip()
        if text:
            lines.append(f"{speaker}: {text}")

    transcript_text = "\n".join(lines) if lines else "(No transcript recorded)"
    prompt = _SCORING_PROMPT.replace("{transcript}", transcript_text)

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)

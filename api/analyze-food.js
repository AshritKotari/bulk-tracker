module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Browser preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { image } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: "No image received"
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured"
      });
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",

          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `
Analyze this food photo.

Identify the food as accurately as possible and estimate the nutrition for the visible portion.

Return ONLY valid JSON in exactly this format:

{
  "foodName": "name of food",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "fibre": 0
}

Use numbers only for calories, protein, fat and fibre.
Calories should be kcal.
Protein, fat and fibre should be grams.

If the portion size cannot be determined exactly, give a reasonable estimate and do not invent excessive precision.
                  `
                },
                {
                  type: "input_image",
                  image_url: image
                }
              ]
            }
          ]
        })
      }
    );

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI error:", data);

      return res.status(openaiResponse.status).json({
        error: data.error?.message || "OpenAI request failed"
      });
    }

    // Responses API normally provides output_text
    let outputText = data.output_text || "";

    // Fallback if output_text isn't available
    if (!outputText && data.output) {
      for (const item of data.output) {
        if (item.content) {
          for (const content of item.content) {
            if (content.text) {
              outputText += content.text;
            }
          }
        }
      }
    }

    if (!outputText) {
      return res.status(500).json({
        error: "AI returned no analysis"
      });
    }

    // Remove accidental markdown code fences
    outputText = outputText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let result;

    try {
      result = JSON.parse(outputText);
    } catch (error) {
      console.error("Invalid AI JSON:", outputText);

      return res.status(500).json({
        error: "AI returned invalid nutrition data"
      });
    }

    return res.status(200).json({
      output_text: JSON.stringify(result)
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
};

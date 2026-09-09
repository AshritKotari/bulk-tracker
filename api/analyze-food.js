module.exports = async (req, res) => {
  // Allow your GitHub Pages website to call this Vercel function
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle browser CORS check
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed"
    });
  }

  try {
    const { image } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: "No food image received"
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing in Vercel"
      });
    }

    const response = await fetch(
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
Look at this food photo and estimate the nutrition.

Identify the food and estimate the visible portion.

Return ONLY valid JSON.
Do not include markdown or explanations.

Use exactly this format:

{
  "foodName": "food name",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "fibre": 0
}

Rules:
- calories = kcal
- protein = grams
- fat = grams
- fibre = grams
- Use reasonable estimates.
- Use numbers only for nutrition values.
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

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      return res.status(response.status).json({
        error: data.error?.message || "OpenAI API request failed"
      });
    }

    let resultText = data.output_text || "";

    // Fallback for Responses API output structure
    if (!resultText && data.output) {
      for (const item of data.output) {
        if (item.content) {
          for (const content of item.content) {
            if (content.text) {
              resultText += content.text;
            }
          }
        }
      }
    }

    if (!resultText) {
      return res.status(500).json({
        error: "No analysis was returned by AI"
      });
    }

    // Remove markdown code fences if AI adds them
    resultText = resultText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let nutrition;

    try {
      nutrition = JSON.parse(resultText);
    } catch (error) {
      console.error("Invalid JSON from AI:", resultText);

      return res.status(500).json({
        error: "AI returned invalid nutrition data",
        raw: resultText
      });
    }

    return res.status(200).json({
      output_text: JSON.stringify({
        foodName: nutrition.foodName || "Unknown food",
        calories: Number(nutrition.calories) || 0,
        protein: Number(nutrition.protein) || 0,
        fat: Number(nutrition.fat) || 0,
        fibre: Number(nutrition.fibre) || 0
      })
    });

  } catch (error) {
    console.error("Function error:", error);

    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
};

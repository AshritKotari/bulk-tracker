export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                error: "No image received"
            });
        }

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.OPENAI_API_KEY}`
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

Identify the foods visible and estimate
the approximate portion sizes.

Return ONLY valid JSON in this format:

{
  "foodName": "string",
  "foods": [
    {
      "name": "string",
      "portion": "string"
    }
  ],
  "calories": number,
  "protein": number,
  "fat": number,
  "fibre": number
}

Nutrition values must be estimates.
Do not claim that the values are exact.
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

            return res.status(response.status).json({
                error: data
            });

        }


        return res.status(200).json(data);


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "AI analysis failed"
        });

    }

}

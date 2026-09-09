module.exports = async (req, res) => {

    // CORS
    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    // Browser preflight
    if (req.method === "OPTIONS") {

        return res
            .status(200)
            .end();

    }


    // Only POST
    if (req.method !== "POST") {

        return res
            .status(405)
            .json({
                error: "Only POST requests are allowed"
            });

    }


    try {

        const image =
            req.body?.image;


        if (!image) {

            return res
                .status(400)
                .json({
                    error: "No image received"
                });

        }


        const apiKey =
            process.env.OPENAI_API_KEY;


        if (!apiKey) {

            return res
                .status(500)
                .json({
                    error:
                        "OPENAI_API_KEY is missing"
                });

        }


        const aiResponse =
            await fetch(
                "https://api.openai.com/v1/responses",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`

                    },

                    body: JSON.stringify({

                        model: "gpt-5.6-luna",

                        input: [

                            {

                                role: "user",

                                content: [

                                    {

                                        type:
                                            "input_text",

                                        text: `
Analyze this food photograph.

Identify the food and estimate the
nutrition for the visible portion.

Return ONLY valid JSON.

Use exactly:

{
  "foodName": "food name",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "fibre": 0
}

Calories are kcal.
Protein, fat and fibre are grams.

Give reasonable estimates.
Do not include explanations.
`

                                    },

                                    {

                                        type:
                                            "input_image",

                                        image_url:
                                            image

                                    }

                                ]

                            }

                        ]

                    })

                }
            );


        const data =
            await aiResponse.json();


        if (!aiResponse.ok) {

            console.error(
                "AI ERROR:",
                data
            );

            return res
                .status(aiResponse.status)
                .json({
                    error:
                        data.error?.message ||
                        "AI request failed"
                });

        }


        let resultText =
            data.output_text || "";


        if (
            !resultText &&
            data.output
        ) {

            for (
                const item
                of data.output
            ) {

                if (item.content) {

                    for (
                        const content
                        of item.content
                    ) {

                        if (content.text) {

                            resultText +=
                                content.text;

                        }

                    }

                }

            }

        }


        if (!resultText) {

            return res
                .status(500)
                .json({
                    error:
                        "AI returned no result"
                });

        }


        resultText =
            resultText
                .replace(
                    /```json/gi,
                    ""
                )
                .replace(
                    /```/g,
                    ""
                )
                .trim();


        let result;


        try {

            result =
                JSON.parse(resultText);

        } catch (error) {

            console.error(
                "JSON ERROR:",
                resultText
            );

            return res
                .status(500)
                .json({
                    error:
                        "AI returned invalid data"
                });

        }


        return res
            .status(200)
            .json({

                output_text:
                    JSON.stringify({

                        foodName:
                            result.foodName ||
                            "Unknown food",

                        calories:
                            Number(
                                result.calories
                            ) || 0,

                        protein:
                            Number(
                                result.protein
                            ) || 0,

                        fat:
                            Number(
                                result.fat
                            ) || 0,

                        fibre:
                            Number(
                                result.fibre
                            ) || 0

                    })

            });


    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );

        return res
            .status(500)
            .json({

                error:
                    error.message ||
                    "Server error"

            });

    }

};

import { zodResponseFormat } from "openai/helpers/zod";
import { OpenAI } from "openai";
import { z } from "zod";
import { config } from "../config/config.js";

const foodAnalysisSchema = z.object({
  foodName: z
    .string()
    .describe("The name of the food item detected in the image."),
  calories: z
    .number()
    .describe("The estimated number of calories in the food item."),
  protein: z.number().describe("The estimated amount of protein in grams."),
  fat: z.number().describe("The estimated amount of fat in grams."),
  mealType: z
    .enum(["breakfast", "lunch", "dinner", "snack"])
    .describe("The type of meal the food item is typically associated with."),
  carbs: z.number().describe("The estimated amount of carbohydrates in grams."),
});

type FoodAnalysisResult = z.infer<typeof foodAnalysisSchema>;

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export const analyzeFoodImage = async (
  imageUrl: string,
): Promise<FoodAnalysisResult> => {
  try {
    console.log("analyzing food...");

    const completion = await openai.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this food image and provide nutritional information. 
              Make your best estimate for a typical serving size shown in the image.
              Provide accurate nutritional values based on the food visible in the image.`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "low",
              },
            },
          ],
        },
      ],

      // Use the Zod schema to validate and parse the response
      response_format: zodResponseFormat(foodAnalysisSchema, "foodAnalysis"),
      max_completion_tokens: 300,
    });

    console.log("completion:", JSON.stringify(completion, null, 2));

    const message = completion.choices[0]?.message;
    // Check if the message is present and has content
    if (message?.parsed) {
      console.log("Parsed message:", message.parsed);
      return {
        foodName: message.parsed.foodName,
        calories: message.parsed.calories,
        protein: message.parsed.protein,
        fat: message.parsed.fat,
        mealType: message.parsed.mealType,
        carbs: message.parsed.carbs,
      };
    }
    if (message?.refusal) {
      console.log("Refused message:", message.refusal);
      throw new Error(
        "OpenAI refused to analyze the image. The content may not be suitable for analysis.",
      );
    }

    throw new Error("No valid response from OpenAI.");
  } catch (error) {
    console.error("Error analyzing food image:", error);
    throw error;
  }
};

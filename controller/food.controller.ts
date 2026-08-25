import { Request, Response } from "express";
import sharp from "sharp";
import crypto from "crypto";
import { r2Config } from "../config/r2.js";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { analyzeFoodImage } from "../services/openai.js";
import FoodEntry from "../models/foodEntry.js";

const optimizeImage = async (buffer: Buffer): Promise<Buffer> => {
  const originalsize = buffer.length;
  const optimizedBuffer = await sharp(buffer)
    .rotate()
    .resize(1024, 1024, {
      fit: "inside",
      withoutEnlargement: true, // Maintain aspect ratio and prevent enlargement
    })
    .jpeg({ quality: 80, mozjpeg: true }) // Use mozjpeg for better compression
    .toBuffer();

  return optimizedBuffer;
};

//r2
const uploadToR2 = async (
  buffer: Buffer,
): Promise<{ url: string; key: string }> => {
  const fileName = `${crypto.randomBytes(16).toString("hex")}.jpg`;
  const key = `colorie-tracker-app/${fileName}`;

  try {
    // upload r2 client
    const command = new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    });
    console.log("Uploading to R2 with command:", command);
    const result = await r2Config.client.send(command);
    console.log("Upload result successful:", result);
    return {
      url: `${r2Config.publicUrl}/${key}`,
      key: key,
    };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error("Failed to upload image to R2.");
  }
};

export const scanfood = async (req: Request, res: Response): Promise<void> => {
  try {
    //get image from request body

    if (!req.file) {
      res
        .status(400)
        .json({ message: "please upload an image of a food item." });
      return;
    }

    const image = req.file.buffer;

    //optimize image using sharp
    console.log(optimizeImage);
    const optimizedImage = await optimizeImage(image);

    // upload image to cloudflare r2
    console.log(uploadToR2);
    const { url, key } = await uploadToR2(optimizedImage);
    console.log("Image uploaded to R2 with URL:", url, "and key:", key);
    // send image to openai api for food scanning
    console.log("analyzing food ...");
    const foodAnalysis = await analyzeFoodImage(url);
    console.log("Food analysis result:", foodAnalysis);
    //save food data to database
    const foodEntry = await FoodEntry.create({
      userId: req.user?._id,
      foodName: foodAnalysis.foodName,
      calories: foodAnalysis.calories,
      protein: foodAnalysis.protein,
      carbs: foodAnalysis.carbs,
      fat: foodAnalysis.fat,
      mealType: foodAnalysis.mealType,
      imageUrl: url,
      storageKey: key,
    });

    // return food name, calories, and other
    res.status(200).json({
      message: "Food scanned and saved successfully.",
      food: foodEntry,
    });

    // nutritional information in response
  } catch (error) {
    console.error("Error scanning food:", error);
    res.status(500).json({ message: "Failed to scan food." });
  }
};

//

export const analyzeFood = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    //get image from request body

    if (!req.file) {
      res
        .status(400)
        .json({ message: "please upload an image of a food item." });
      return;
    }

    //check user is authenticated
    if (!req.user?._id) {
      res.status(401).json({ message: "Unauthorized. Please log in." });
      return;
    }

    const image = req.file.buffer;

    //optimize image using sharp
    console.log(optimizeImage);
    const optimizedImage = await optimizeImage(image);

    // upload image to cloudflare r2
    console.log(uploadToR2);
    const { url, key } = await uploadToR2(optimizedImage);
    console.log("Image uploaded to R2 with URL:", url, "and key:", key);
    // send image to openai api for food scanning
    console.log("analyzing food ...");
    const foodData = await analyzeFoodImage(url);
    console.log("Food analysis result:", foodData);

    // base64 encode the image buffer
    const base64Image = `data:image/jpeg;base64,${optimizedImage.toString("base64")}`;
    console.log("Base64 encoded image:");
    res.status(200).json({
      ...foodData,
      imageUrl: url,
      storageKey: key,
      base64Image,
    });
  } catch (error) {
    console.error("Error analyzing food:", error);
    res.status(500).json({ message: "Failed to analyze food." });
  }
};

export const saveFoodEntry = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      foodName,
      calories,
      protein,
      carbs,
      fat,
      mealType,
      imageUrl,
      storageKey,
    } = req.body;

    if (!foodName || !calories === undefined || !imageUrl || !storageKey) {
      res
        .status(400)
        .json({ message: "Missing required fields. all fields are required." });
      return;
    }

    //check user is authenticated
    if (!req.user?._id) {
      res.status(401).json({ message: "Unauthorized. Please log in." });
      return;
    }

    const foodEntry = await FoodEntry.create({
      userId: req.user?._id,
      foodName,
      calories,
      protein,
      carbs,
      fat,
      mealType: mealType || "snack",
      imageUrl,
      storageKey,
    });
    console.log("Food entry saved to database:", foodEntry);

    res.status(200).json({
      message: "Food entry saved successfully.",
      food: foodEntry,
    });
  } catch (error) {
    console.error("Error saving food entry:", error);
    res.status(500).json({ message: "Failed to save food entry." });
  }
};

export const discardanalyzedFood = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { storageKey } = req.body;

    if (!storageKey) {
      res.status(400).json({ message: "Missing required field: storageKey." });
      return;
    }

    //check user is authenticated
    if (!req.user?._id) {
      res.status(401).json({ message: "Unauthorized. Please log in." });
      return;
    }

    // Delete the food entry from r2
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: r2Config.bucketName,
        Key: storageKey,
      });
      await r2Config.client.send(deleteCommand);
      console.log("Food entry deleted from R2 with key:", storageKey);
      res.status(200).json({ message: "Food entry discarded successfully." });
    } catch (error) {
      console.error("Error discarding food entry:", error);
      res.status(500).json({ message: "Failed to discard food entry." });
      return;
    }
  } catch (error) {
    console.error("Error discarding food entry:", error);
    res.status(500).json({ message: "Failed to discard food entry." });
    return;
  }
};

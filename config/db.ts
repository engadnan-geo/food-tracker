import mongoose from "mongoose";
import {config} from "./config.js";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = config.mongodbUri;

    if (!mongoURI) {
      throw new Error(
        "MongoDB URI is not defined in the environment variables.",
      );
    }
    const conn = await mongoose.connect(mongoURI as string);
    console.log(`😂❤️MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("😒🚩Error connecting to MongoDB:", errorMessage);
  }
};

export default connectDB;

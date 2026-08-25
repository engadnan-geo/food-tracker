import { Request, Response } from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "10d",
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, dailyCalorieGoal } = req.body;

    if (!email || !password || !name) {
      res
        .status(400)
        .json({ message: "Email, password, and name are required." });
      return;
    }

    //normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if the user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({ message: "User already exists." });
      return;
    }

    // Create a new user
    const user = await User.create({
      email: normalizedEmail,
      password,
      name,
      dailyColorieGoal: dailyCalorieGoal || 2000, // default to 2000 if not provided
    });

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        email: user.email,
        name: user.name,
        dailyColorieGoal: user.dailyColorieGoal,
        token: generateToken(user._id.toString()),
      },
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }
    //normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if the user exists
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );

    if (!user) {
      res.status(401).json({ message: "Invalid email ." });
      return;
    }

    // Check if the password matches

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid password." });
      return;
    }
    const token = generateToken(user._id.toString());

    res.status(200).json({
      message: "Login successful.",
      user: {
        email: user.email,
        name: user.name,
        dailyColorieGoal: user.dailyColorieGoal,
        token: token,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      message: "User fetched successfully.",
      user: req.user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error fetching user." });
  }
};

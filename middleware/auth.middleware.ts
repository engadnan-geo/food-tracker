import { NextFunction, Request, Response } from "express";
import User, { IUser } from "../models/User.js";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Add the user property to the Request interface
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  let token: string | undefined;

  // check if the token is provided in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1]; // Extract the token from the header
      if (!token) {
        res.status(401).json({ message: "No token provided." });
        return;
      }

      // Verify the token and extract the user ID
      const decoded = jwt.verify(
        token,
        (process.env.JWT_SECRET as string) || "",
      ) as {
        id: string;
      };

      //get the user from the database using the extracted ID
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        res.status(404).json({ message: "Unauthorized, invalid user token." });
        return;
      }
      req.user = user;
      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      res.status(401).json({ message: "Unauthorized, invalid token." });
      console.error("Error verifying token:", error);
      return;
    }
  } else {
    res.status(401).json({ message: "No token provided." });
    return;
  }
};

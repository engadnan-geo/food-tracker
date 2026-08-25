import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authrouter from "./routes/auth.js";
import foodRoutes from "./routes/food.route.js";
import reportsRouter from "./routes/reports.routes.js";

dotenv.config();
const app = express();
connectDB();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//api routes
app.post("/test", (req, res) => {
  console.log("Request Content-Type:", req.headers["content-type"]);
  console.log("Request Body:", req.body);

  res.json({
    contentType: req.headers["content-type"],
    body: req.body,
  });
});

app.use("/api/auth", authrouter);
app.use("/api/food", foodRoutes);
app.use("/api/reports", reportsRouter);
app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.json({
    message: "Hello from the backend!",
    status: "success",
    data: {
      name: "Colorie Trucker App",
      version: "1.0.0",
      description: "A backend server for the Colorie Trucker App",
    },
  });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});

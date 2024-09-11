import express from "express";
import { storeRoutes } from "./routes";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieParser());
app.use("/", storeRoutes);

app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

export { app, PORT };

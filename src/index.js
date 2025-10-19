import dotenv from "dotenv/config";
import connectDB from "./db/dbConnection.js";
import { app } from "./app.js";

const port = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.on("error", (err) => {
      console.log("err: ", err);
      process.exit(1);
    });

    app.listen(port, () => {
      console.log(`Server is listening at port ${port}`);
    });
  })
  .catch((err) => console.log("MongoDB connection failed !! ", err));

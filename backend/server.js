import express from "express";
import "dotenv/config";

import db from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

const PORT = 5000;
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health" ,(req , res) => {
    res.status(200).json({
        success: true,
        message:"Backend is runing"
    });
});

app.get("/api/db-test", async (req, res) => {
    try {
        const users = await db.orm.public.User.all();

        res.status(200).json({
            success: true,
            message: "Database connected",
            users
        });
    } 
    catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

app.listen(PORT , ()=>{
    console.log(`Server is running ${PORT}`);
});

 
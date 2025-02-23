import express from "express";
import cors from "cors"; // Import cors
import fs from "fs"; // Import fs to handle file system
import path from "path"; // Import path to handle file paths
import { fileURLToPath } from "url"; // Import fileURLToPath
import { dirname } from "path"; // Import dirname

const __filename = fileURLToPath(import.meta.url); // Get the current file path
const __dirname = dirname(__filename); // Get the directory name

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON bodies

app.post("/analyze", (req, res) => {
    const { image } = req.body; // Get the image data from the request body

    // Check if image data is provided
    if (!image) {
        return res.status(400).send("No image data provided");
    }

    // Extract the base64 string from the data URL
    const base64Data = image.replace(/^data:image\/png;base64,/, "");

    // Define the path where you want to save the image
    const filePath = path.join(__dirname, "uploads", `image-${Date.now()}.png`);

    // Write the file to the filesystem
    fs.writeFile(filePath, base64Data, "base64", (err) => {
        if (err) {
            console.error("Error saving the image:", err);
            return res.status(500).send("Error saving the image");
        }
        console.log("Image saved successfully:", filePath);
        res.send("Image saved successfully");
    });
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

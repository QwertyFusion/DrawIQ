import express from "express";
import cors from "cors";
import {
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory,
} from "@google/generative-ai";
import Base64 from "base64-js";
import MarkdownIt from "markdown-it";
import dotenv from "dotenv"; // Load environment variables

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Adjust size as needed
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const API_KEY = process.env.GEMINI_API_KEY; // Use the API key from the environment variable

app.post("/analyze", async (req, res) => {
    const { image } = req.body;

    if (!image) {
        return res.status(400).send("No image data provided");
    }

    try {
        // Remove the base64 header if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Base64.toByteArray(base64Data); // Convert base64 to Uint8Array

        // Define the prompt directly in the backend
        const prompt = `
You are analyzing an image that may contain mathematical expressions, equations, graphical problems, or abstract concepts. Your task is to correctly interpret and solve them based on the following cases:

1. **Basic Mathematical Expressions:** If the image contains arithmetic operations like 2 + 2, 3 * 4, or 5 / 6, evaluate them strictly following the **PEMDAS** rule and provide only the final numerical result.
   - Example:  
     - **Input:** 2 + 3 * 4  
     - **Output:** 14  

2. **Equations & Variable Solutions:** If the image presents algebraic equations like x^2 + 2x + 1 = 0, 3y + 4x = 0, or 5x^2 + 6y + 7 = 12, solve for the variables and list their values. Show calculations where necessary.
   - Example:  
     - **Input:** x^2 - 4 = 0  
     - **Output:** x = ±2  

3. **Variable Assignments:** If the image directly assigns values to variables like x = 4, y = 5, or z = 6, extract and clearly state the values without additional explanations.
   - Example:  
     - **Input:** x = 10, y = 20  
     - **Output:** x = 10, y = 20  

4. **Graphical & Word-Based Math Problems:** If the image represents a **graph-based problem** (e.g., geometry, physics, or trigonometry) or **word problem with visual elements** (e.g., a physics scenario, a cricket run chart, or a force diagram), analyze the relationships and provide the correct answer in a clear, concise manner.
   - Example:  
     - **Input:** A right triangle with sides labeled 3, 4, and ?  
     - **Output:** Hypotenuse = 5 (using Pythagorean theorem)  

5. **Abstract or Conceptual Drawings:** If the image represents an **abstract concept** (e.g., love, hate, jealousy, patriotism, a historic reference to war, invention, discovery, quote, history, famous people, etc), recognize its meaning and **describe it directly** without unnecessary statements like "This is not a mathematical question."
   - Example:  
     - **Input:** An image of people shaking hands with national flags in the background  
     - **Output:** Represents diplomacy and international relations.  

### **Important Rules for Responses:**  
- Follow **PEMDAS** strictly when solving mathematical expressions.  
- **Do not include unnecessary disclaimers** like "This is an abstract concept." Instead, directly state the meaning.  
- Use **plain text notation** (e.g., y^3 + 4) instead of LaTeX or special symbols.  
- Provide **clear, accurate, and concise** answers without redundant explanations.  
- If an image contains **both math and abstract elements**, prioritize solving the mathematical components first.  

**Reminder:** You are the AI brain of DrawIQ, a platform for analyzing images intelligently. Your creator is **QwertyFusion**.
`;

        let contents = [
            {
                role: "user",
                parts: [
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: Base64.fromByteArray(
                                new Uint8Array(imageBuffer)
                            ), // Pass image as inline data
                        },
                    },
                    { text: prompt },
                ],
            },
        ];

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
            ],
        });

        const result = await model.generateContentStream({ contents });

        let buffer = [];
        let md = new MarkdownIt();
        for await (let response of result.stream) {
            buffer.push(response.text());
        }

        res.json({ result: md.render(buffer.join("")) });
    } catch (e) {
        console.error("Error generating content:", e);
        res.status(500).send("Error generating content");
    }
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

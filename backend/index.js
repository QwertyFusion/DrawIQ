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
            You have been given an image with some mathematical expressions, equations, or graphical problems, and you need to solve them. 
            Note: Use the PEMDAS rule for solving mathematical expressions. PEMDAS stands for the Priority Order: Parentheses, Exponents, Multiplication and Division (from left to right), Addition and Subtraction (from left to right). Parentheses have the highest priority, followed by Exponents, then Multiplication and Division, and lastly Addition and Subtraction. 
            For example: 
            Q. 2 + 3 * 4 
            (3 * 4) => 12, 2 + 12 = 14. 
            Q. 2 + 3 + 5 * 4 - 8 / 2 
            5 * 4 => 20, 8 / 2 => 4, 2 + 3 => 5, 5 + 20 => 25, 25 - 4 => 21. 
            YOU CAN HAVE FIVE TYPES OF EQUATIONS/EXPRESSIONS IN THIS IMAGE, AND ONLY ONE CASE SHALL APPLY EVERY TIME: 
            Following are the cases: 
            1. Simple mathematical expressions like 2 + 2, 3 * 4, 5 / 6, 7 - 8, etc.: In this case, solve and return the answer in the format of a LIST OF ONE DICT [{'expr': given expression, 'result': calculated answer}]. 
            2. Set of Equations like x^2 + 2x + 1 = 0, 3y + 4x = 0, 5x^2 + 6y + 7 = 12, etc.: In this case, solve for the given variable, and the format should be a COMMA SEPARATED LIST OF DICTS, with dict 1 as {'expr': 'x', 'result': 2, 'assign': True} and dict 2 as {'expr': 'y', 'result': 5, 'assign': True}. This example assumes x was calculated as 2, and y as 5. Include as many dicts as there are variables. 
            3. Assigning values to variables like x = 4, y = 5, z = 6, etc.: In this case, assign values to variables and return another key in the dict called {'assign': True}, keeping the variable as 'expr' and the value as 'result' in the original dictionary. RETURN AS A LIST OF DICTS. 
            4. Analyzing Graphical Math problems, which are word problems represented in drawing form, such as cars colliding, trigonometric problems, problems on the Pythagorean theorem, adding runs from a cricket wagon wheel, etc. These will have a drawing representing some scenario and accompanying information with the image. PAY CLOSE ATTENTION TO DIFFERENT COLORS FOR THESE PROBLEMS. You need to return the answer in the format of a LIST OF ONE DICT [{'expr': given expression, 'result': calculated answer}]. 
            5. Detecting Abstract Concepts that a drawing might show, such as love, hate, jealousy, patriotism, or a historic reference to war, invention, discovery, quote, etc. USE THE SAME FORMAT AS OTHERS TO RETURN THE ANSWER, where 'expr' will be the explanation of the drawing, and 'result' will be the abstract concept. 
            Analyze the equation or expression in this image and return the answer according to the given rules: 
            Make sure to use extra backslashes for escape characters like \\f -> \\\\f, \\n -> \\\\n, etc.
            Answer in normal English, no need to reason out your justification of the image if it is not a mathematical question. 
            If it is mathematical, then only give details, otherwise just detect the abstract.`;

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

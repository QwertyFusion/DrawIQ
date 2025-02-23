import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import parse from "html-react-parser";
import {
    Pencil,
    Eraser,
    Undo,
    RotateCcw,
    Play,
    Square,
    Circle as CircleIcon,
    Minus,
    X,
} from "lucide-react";

function App() {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("#ffffff");
    const [mode, setMode] = useState("draw"); // 'draw', 'erase', 'rect', 'circle', 'line'
    const [toolbarPosition, setToolbarPosition] = useState({
        x: window.innerWidth / 2 - 250, // Center toolbar (approximate width/2)
        y: 20,
    });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showColorPicker, setShowColorPicker] = useState(false);
    const toolbarRef = useRef(null);
    const [history, setHistory] = useState([]);
    const [historyStep, setHistoryStep] = useState(-1);
    const [startPoint, setStartPoint] = useState(null);
    const [previewShape, setPreviewShape] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const colors = [
        "#FFFFFF",
        "#FF0000",
        "#00FF00",
        "#009CFF",
        "#FFFF00",
        "#FF69B4",
        "#8B4513",
    ];

    // Add new refs for performance
    const toolbarPosRef = useRef(toolbarPosition);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#1a1a1a"; // Dark background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Handle window resize
        const handleResize = () => {
            const imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            ctx.putImageData(imageData, 0, 0);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const updateToolbarPosition = () => {
            const toolbar = toolbarRef.current;
            if (toolbar) {
                setToolbarPosition({
                    x: (window.innerWidth - toolbar.offsetWidth) / 2,
                    y: 20,
                });
            }
        };

        // Run once after initial render
        setTimeout(updateToolbarPosition, 0);

        // Update on window resize
        window.addEventListener("resize", updateToolbarPosition);
        return () =>
            window.removeEventListener("resize", updateToolbarPosition);
    }, []);

    useEffect(() => {
        // Save initial canvas state
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const initialState = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );
        setHistory([initialState]);
        setHistoryStep(0);
    }, []);

    const saveToHistory = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const currentState = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Remove any states after current step if we've gone back in history
        const newHistory = history.slice(0, historyStep + 1);
        setHistory([...newHistory, currentState]);
        setHistoryStep(historyStep + 1);
    };

    const drawPreviewShape = () => {
        if (!previewShape || !startPoint) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Restore the previous state before drawing preview
        if (history[historyStep]) {
            ctx.putImageData(history[historyStep], 0, 0);
        }

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const { x: x1, y: y1 } = startPoint;
        const { x: x2, y: y2 } = previewShape;

        switch (mode) {
            case "rect":
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                break;
            case "circle":
                const radius = Math.sqrt(
                    Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
                );
                ctx.beginPath();
                ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
            case "line":
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                break;
        }
    };

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (["rect", "circle", "line"].includes(mode)) {
            setStartPoint({ x, y });
            setIsDrawing(true);
            return;
        }

        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(x, y);

        if (mode === "draw") {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
        } else if (mode === "erase") {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#1a1a1a"; // Match canvas background color
            ctx.lineWidth = 20; // Larger width for eraser
        }
    };

    const draw = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (["rect", "circle", "line"].includes(mode) && isDrawing) {
            setPreviewShape({ x, y });
            drawPreviewShape();
            return;
        }

        if (!isDrawing || mode === "text") return;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        if (mode === "draw" || mode === "erase") {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        if (isDrawing) {
            if (["rect", "circle", "line"].includes(mode)) {
                saveToHistory();
            } else if (mode !== "text") {
                saveToHistory();
            }
        }
        setIsDrawing(false);
        setStartPoint(null);
        setPreviewShape(null);
    };

    const handleRun = async () => {
        try {
            setIsLoading(true);
            const canvas = canvasRef.current;
            const imageData = canvas.toDataURL("image/png");

            const response = await fetch("http://localhost:3000/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ image: imageData }),
            });

            if (!response.ok) {
                throw new Error("Failed to analyze image");
            }

            const data = await response.json();
            setResult(data.result);
            setShowModal(true);
        } catch (error) {
            console.error("Error:", error);
            setResult(error.message);
            setShowModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToolbarMouseDown = (e) => {
        if (showColorPicker) return; // Prevent dragging when color picker is open

        // Prevent text selection during drag
        e.preventDefault();

        if (
            e.target === toolbarRef.current ||
            toolbarRef.current.contains(e.target)
        ) {
            isDraggingRef.current = true;
            const rect = toolbarRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        }
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;

        requestAnimationFrame(() => {
            const toolbar = toolbarRef.current;
            if (!toolbar) return;

            // Calculate viewport bounds
            const maxX = window.innerWidth - toolbar.offsetWidth;
            const maxY = window.innerHeight - toolbar.offsetHeight;

            // Calculate new position with bounds checking
            const newX = Math.min(Math.max(0, e.clientX - dragOffset.x), maxX);
            const newY = Math.min(Math.max(0, e.clientY - dragOffset.y), maxY);

            // Update ref for current position
            toolbarPosRef.current = { x: newX, y: newY };

            // Apply transform directly for smooth movement
            toolbar.style.transform = `translate(${newX}px, ${newY}px)`;
        });
    };

    const handleMouseUp = () => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            // Update React state only when dragging ends
            setToolbarPosition(toolbarPosRef.current);
        }
    };

    // Attach event listeners once
    useEffect(() => {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [dragOffset]); // Only re-attach if dragOffset changes

    // Update toolbar position ref when state changes
    useEffect(() => {
        toolbarPosRef.current = toolbarPosition;
    }, [toolbarPosition]);

    const handleUndo = () => {
        if (historyStep > 0) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            const newStep = historyStep - 1;
            ctx.putImageData(history[newStep], 0, 0);
            setHistoryStep(newStep);
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Reset history
        const newState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([newState]);
        setHistoryStep(0);
    };

    return (
        <div className="w-screen h-screen overflow-hidden bg-gray-900">
            <div
                ref={toolbarRef}
                className={`fixed flex items-center gap-4 p-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 transition-none select-none ${
                    showColorPicker
                        ? "cursor-default"
                        : "cursor-grab active:cursor-grabbing"
                }`}
                style={{
                    left: "0px",
                    top: "0px",
                    transform: `translate(${toolbarPosition.x}px, ${toolbarPosition.y}px)`,
                    touchAction: "none",
                    willChange: "transform", // Hint to browser for optimization
                }}
                onMouseDown={handleToolbarMouseDown}
            >
                <div className="absolute top-0 left-0 right-0 h-2 bg-gray-700 rounded-t-lg" />
                <div className="flex items-center gap-2 pr-4 border-r border-gray-600">
                    <img
                        src="/drawiq-logo.svg"
                        alt="DrawIQ"
                        className="w-8 h-8"
                    />
                    <span className="text-white font-semibold">DrawIQ</span>
                </div>
                <div className="relative">
                    <div className="flex gap-2 items-center">
                        {colors.map((c) => (
                            <div
                                key={c}
                                className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${
                                    color === c
                                        ? "ring-2 ring-white"
                                        : "ring-1 ring-gray-600"
                                }`}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                            />
                        ))}
                        <button
                            className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500 transition-transform hover:scale-110 ${
                                showColorPicker
                                    ? "ring-2 ring-white"
                                    : "ring-1 ring-gray-600"
                            }`}
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            title="Custom Color"
                        >
                            <span className="sr-only">Custom Color</span>
                        </button>
                    </div>

                    {showColorPicker && (
                        <div
                            className="absolute top-12 left-0 z-50 p-3 bg-gray-800 rounded-lg shadow-xl border border-gray-700"
                            onClick={(e) => e.stopPropagation()} // Prevent toolbar drag when interacting with picker
                        >
                            <HexColorPicker color={color} onChange={setColor} />
                            <div className="mt-3 text-center bg-gray-700 p-2 rounded-md">
                                <input
                                    type="text"
                                    value={color.toUpperCase()}
                                    onChange={(e) => {
                                        const newColor = e.target.value;
                                        if (/^#[0-9A-F]{6}$/i.test(newColor)) {
                                            setColor(newColor);
                                        }
                                    }}
                                    className="bg-transparent text-white text-center font-mono w-20 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="h-6 w-px bg-gray-600 mx-2" /> {/* Separator */}
                <div className="flex gap-2 items-center">
                    <button
                        className={`p-2 rounded-md transition-colors ${
                            mode === "draw"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        }`}
                        onClick={() => setMode("draw")}
                        title="Draw"
                    >
                        <Pencil size={20} />
                    </button>
                    <button
                        className={`p-2 rounded-md transition-colors ${
                            mode === "rect"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        }`}
                        onClick={() => setMode("rect")}
                        title="Rectangle"
                    >
                        <Square size={20} />
                    </button>
                    <button
                        className={`p-2 rounded-md transition-colors ${
                            mode === "circle"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        }`}
                        onClick={() => setMode("circle")}
                        title="Circle"
                    >
                        <CircleIcon size={20} />
                    </button>
                    <button
                        className={`p-2 rounded-md transition-colors ${
                            mode === "line"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        }`}
                        onClick={() => setMode("line")}
                        title="Line"
                    >
                        <Minus size={20} />
                    </button>
                    <button
                        className={`p-2 rounded-md transition-colors ${
                            mode === "erase"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        }`}
                        onClick={() => setMode("erase")}
                        title="Erase"
                    >
                        <Eraser size={20} />
                    </button>
                    <button
                        onClick={handleUndo}
                        disabled={historyStep <= 0}
                        className={`p-2 rounded-md transition-colors ${
                            historyStep <= 0
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        }`}
                        title="Undo"
                    >
                        <Undo size={20} />
                    </button>
                </div>
                <div className="h-6 w-px bg-gray-600 mx-2" /> {/* Separator */}
                <div className="flex gap-2">
                    <button
                        onClick={resetCanvas}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        title="Reset Canvas"
                    >
                        <RotateCcw size={20} />
                        <span>Reset</span>
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-3 py-2 ${
                            isLoading
                                ? "bg-green-700 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700"
                        } text-white rounded-md transition-colors`}
                        title="Run"
                    >
                        <Play size={20} />
                        <span>{isLoading ? "Processing..." : "Run"}</span>
                    </button>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full cursor-crosshair"
            />

            {showModal && (
                <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800/90 rounded-lg p-6 max-w-lg w-full shadow-xl border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">
                                Analysis Result
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="text-gray-200 whitespace-pre-wrap">
                            {parse(result)}
                        </div>
                        <button
                            onClick={() => setShowModal(false)}
                            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession } from "aws-amplify/auth";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { Menu, X } from "lucide-react";

function getUsernameFromToken(idToken: string) {
    if (idToken) {
        const decoded = jwtDecode<JwtPayload & { "cognito:username": string }>(idToken);
        console.log("Username:", decoded["cognito:username"]);
        return decoded["cognito:username"];
    }
    return null;
}

// Example list of WPI courses (this could be fetched from an API)
const wpiMajors = [
    "Electrical and Computer Engineering(ECE)",
    "Computer Science(CS)",
    "Mechanical Engineering(ME)",
    "Biomedical Engineering(BME)",
    "Robotics Engineering(RE)",
    "Aerospace Engineering(AE)",
    "Civil Engineering(CE)",
    "Chemical Engineering(CHE)",
    "Environmental Engineering(ENE)",
    "Industrial Engineering(IE)",
    "Materials Science and Engineering(MSE)",
    "Fire Protection Engineering(FPE)",
    "Architectural Engineering(AE)",
];

const AllCoursesPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        console.log("Fetching user authentication...");
        const checkAuth = async () => {
            try {
                const session = await fetchAuthSession();
                if (session.tokens?.idToken) {
                    setIsAuthenticated(true);
                    const idToken = session.tokens?.idToken;
                    if (typeof idToken === "string") {
                        const username = getUsernameFromToken(idToken);
                        console.log("Decoded Username:", username);
                    }
                } else {
                    router.push("/");
                }
            } catch (err) {
                console.error("Error checking auth session:", err);
                router.push("/");
            }
        };

        checkAuth();
    }, [router]);

    if (isAuthenticated === null) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-xl font-bold">Checking authentication...</p>
            </div>
        );
    }

    return (
        <>
             <div className="min-h-screen flex bg-red-100">
                {/* Sidebar */}
                <div className={`fixed top-0 left-0 h-full bg-gray-700 w-64 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-64"} transition-transform duration-300 ease-in-out shadow-lg z-50 overflow-y-auto`}>
                    <div className="flex justify-between items-center p-4 bg-red-600 text-white">
                        <span className="text-xl font-bold">Courses</span>
                        <button onClick={() => setSidebarOpen(false)} className="text-white hover:text-gray-300">
                            <X size={24} />
                        </button>
                    </div>
                    <nav className="flex flex-col p-4 space-y-2">
                        {wpiMajors.map((course) => (
                            <span key={course} className="block bg-red-500 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition">
                                {course}
                            </span>
                        ))}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex flex-col flex-grow">
                    <header className="bg-red-600 w-full py-4 flex justify-between items-center px-6">
                        {/* Sidebar Toggle Button */}
                        <button onClick={() => setSidebarOpen(true)} className="text-white hover:text-gray-300">
                            <Menu size={30} />
                        </button>
                        <div className="text-white text-3xl font-bold">WPI Course Tracker</div>
                    </header>

                    <div className="flex flex-col bg-red-00 min-h-screen">
                        <nav className="bg-gray-500 p-4 flex justify-center space-x-8 w-full">
                            <Button onClick={() => router.push("/")} variation="primary" className="bg-red-500 hover:bg-red-900 text-white font-bold py-2 px-4 rounded nav-button">
                                Home
                            </Button>
                            <Button onClick={() => router.push("/student/courses")} variation="primary" className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button">
                                My Courses
                            </Button>
                            <Button onClick={() => router.push("/student/progress")} variation="primary" className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button">
                                My Progress
                            </Button>
                            <Button onClick={() => router.push("/student/allcourses")} variation="primary" className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button">
                                All Courses
                            </Button>
                        </nav>
                    </div>

                    {/* Main Content */}
                    <main className="flex-grow p-6 flex flex-col items-center">
                        <h1 className="text-2xl font-bold mb-4">Welcome to Your Courses</h1>
                    </main>
                </div>
            </div>
        </>
    );
};

export default AllCoursesPage;

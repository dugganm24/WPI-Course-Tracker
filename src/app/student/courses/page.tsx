"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession, fetchUserAttributes} from "aws-amplify/auth";
import { Menu, X } from "lucide-react";
import { Amplify } from 'aws-amplify';
import outputs from "../../../aws-exports";
import Card from "../../../components/Card";
import CardContent from "../../../components/CardContent";

Amplify.configure(outputs);

const wpiMajors = [
    "Electrical and Computer Engineering (ECE)",
    "Computer Science (CS)",
    "Mechanical Engineering (ME)",
    "Biomedical Engineering (BME)",
    "Robotics Engineering (RE)",
    "Aerospace Engineering (AE)",
    "Civil Engineering (CE)",
    "Chemical Engineering (CHE)",
    "Environmental Engineering (ENE)",
    "Industrial Engineering (IE)",
    "Materials Science and Engineering (MSE)",
    "Fire Protection Engineering (FPE)",
    "Architectural Engineering (AE)",
];

interface Course {
    enrollment_id: number;
    display_course_id: string;
    term: string;
    grade: string | null;
    course_section_owner: string;
    academic_unit: string;
}

const CoursesPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [accountType, setAccountType] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const fetchEnrollments = async (wpiID: string) => {
        setLoading(true);
        try {
            console.log("Fetching enrollments for studentID: ", wpiID);
            const response = await fetch('https://3iws0uqwdl.execute-api.us-east-2.amazonaws.com/dev/student/viewEnrollments', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ studentID: wpiID }),
            });

            const data = await response.json();
            console.log("Enrollments data: ", data);

            if (data && data.body) {
                const parsedBody = JSON.parse(data.body);

                if (Array.isArray(parsedBody)) {
                setCourses(parsedBody);
                } else {
                    console.error("Invalid response body: ", parsedBody);
                    setCourses([]);
                }
            }
        } catch (error) {
            console.error("Error fetching enrollments: ", error);            
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
            const checkAuthStatus = async () => {
                try {
                    const session = await fetchAuthSession();
                    if (!session) {
                        setIsAuthenticated(false);
                        setLoading(false);
                        return;
                    }

                    setIsAuthenticated(true);
    
                    const attributes = await fetchUserAttributes();
                    const wpiID = attributes["custom:wpiID"] || null;
                    const accountTypeValue = attributes["custom:account_type"] || null;
                    setAccountType(accountTypeValue);

                    if (wpiID) {
                        fetchEnrollments(wpiID);
                    } else {
                        setError("Student ID not found.");
                    }
                } catch (error) {
                    console.log("Error fetching session or attributes:", error);
                    setIsAuthenticated(false);
                    setAccountType(null);
                } finally {
                    setLoading(false);
                }
            };
    
            checkAuthStatus();
        }, []);
    
        useEffect(() => {
            if (!loading) {
                if (isAuthenticated === false) {
                    router.push("/");
                } else if (isAuthenticated && accountType === "advisor") {
                    alert("Access Denied, must have a valid student account to reach this page");
                    router.push("/");
                }
            }
        }, [loading, isAuthenticated, accountType, router]);
    
        if (loading) {
            return <div className="flex justify-center items-center h-screen text-lg font-bold">Loading...</div>;
        }
    
        if (isAuthenticated === false || accountType !== "student") {
            return null;
        }

        const coursesByUnit = courses.reduce((acc, course) => {
            if (!acc[course.academic_unit]) {
                acc[course.academic_unit] = [];
            }
            acc[course.academic_unit].push(course);
            return acc;
        }, {} as Record<string, Course[]>);
        
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
                            <Button
                                onClick={() => router.push("/")}
                                variation="primary"
                                className="bg-red-500 hover:bg-red-900 text-white font-bold py-2 px-4 rounded nav-button">
                                Home
                            </Button>
                            <Button
                                onClick={() => accountType && router.push(accountType === "student" ? "/student/courses" : "/advisor/courses")}
                                disabled={!accountType}
                                variation="primary"
                                className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button">
                                My Courses
                            </Button>
                            <Button
                                onClick={() => accountType && router.push(accountType === "student" ? "/student/progress" : "/advisor/progress")}
                                disabled={!accountType}
                                variation="primary"
                                className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button">
                                My Progress
                            </Button>
                            <Button
                                onClick={() => accountType && router.push(accountType === "student" ? "/student/allcourses" : "/advisor/allcourses")}
                                disabled={!accountType}
                                variation="primary"
                                className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button">
                                All Courses 
                            </Button>
                        </nav>
                    </div>

                    {/* Course List */}
                    <main className="flex-grow p-6">
                        <h1 className="text-2xl text-black font-bold mb-4">Your Enrolled Courses</h1>  

                        {error && <p className="text-red-500">{error}</p>}

                        {!loading && !error && (
                            <>
                                {courses.length === 0 ? (
                                    <div className="text-lg text-gray-600">
                                        You are not enrolled in any courses yet. Your tracking sheet is available below.
                                    </div>
                                ) : (
                                    Object.entries(coursesByUnit).map(([unit, unitCourses]) => (
                                        <Card key={unit} className="mb-4">
                                            <CardContent>
                                                <h2 className="text-lg font-semibold">{unit}</h2>
                                                <table className="w-full mt-2 border-collapse border border-gray-300">
                                                    <thead>
                                                        <tr className="bg-gray-200">
                                                            <th className="border border-gray-300 px-2 py-1">Course</th>
                                                            <th className="border border-gray-300 px-2 py-1">Term</th>
                                                            <th className="border border-gray-300 px-2 py-1">Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {unitCourses.map((course) => (
                                                            <tr key={course.enrollment_id}>
                                                                <td className="border border-gray-300 px-2 py-1">{course.display_course_id}</td>
                                                                <td className="border border-gray-300 px-2 py-1">{course.term}</td>
                                                                <td className="border border-gray-300 px-2 py-1">{course.grade || "N/A"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default CoursesPage;

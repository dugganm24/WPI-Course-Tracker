"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { Amplify } from 'aws-amplify';
import outputs from "../../../aws-exports";

Amplify.configure(outputs);

interface Student {
    first_name: string;
    last_name: string;
    graduation_year: string | null;
    degree_program: string | null;
    student_id: number;
}

const ViewStudentsPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [accountType, setAccountType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [advisorId, setAdvisorId] = useState<string | null>(null);
    const router = useRouter();

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
                const accountTypeValue = attributes["custom:account_type"] || null;
                setAccountType(accountTypeValue);

                const advisorIdValue = attributes["custom:wpiID"] || null;
                console.log("Advisor ID:", advisorIdValue);
                setAdvisorId(advisorIdValue);
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
        const fetchStudents = async () => {
            try {
                if (advisorId) {
                    const response = await fetch('https://77et8rpf6i.execute-api.us-east-2.amazonaws.com/dev/advisor/viewStudent',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ advisor_id: advisorId }),
                        }
                    );
                    const data = await response.json();
                    console.log("Response data:", data);

                    const body = JSON.parse(data.body);
                    console.log("Parsed body:", body);

                    setStudents(body.students);
                }
            } catch (error) {
                console.error("Error fetching students:", error);
            }
        };

        if (advisorId) {
            fetchStudents();
        }
    }, [advisorId]);

    useEffect(() => {
        if (!loading) {
            if (isAuthenticated === false) {
                router.push("/");
            } else if (isAuthenticated && accountType !== "advisor") {
                alert("Access Denied, must have a valid advisor account to reach this page");
                router.push("/");
            }
        }
    }, [loading, isAuthenticated, accountType, router]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-lg font-bold">Loading...</div>;
    }

    if (isAuthenticated === false || accountType !== "advisor") {
        return null;
    }

    return (
        <>
            <div className="min-h-screen flex flex-col">
                <header className="bg-red-600 w-full py-4 flex justify-center items-center px-6">
                    <div className="text-white text-3xl font-bold">WPI Course Tracker</div>
                </header>

                <div className="flex flex-col bg-red-00">
                    <nav className="bg-gray-300 p-4 flex justify-center space-x-8 w-full">
                        <Button
                            onClick={() => router.push("/")}
                            variation="primary"
                            className="bg-red-500 hover:bg-red-900 text-white font-bold py-2 px-4 rounded nav-button"
                        >
                            Home
                        </Button>
                        <Button
                            onClick={() => accountType && router.push("/advisor/students")}
                            disabled={!accountType}
                            variation="primary"
                            className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button"
                        >
                            View Students
                        </Button>
                    </nav>
                </div>

                <main className="flex-grow p-6 flex flex-col items-center overflow-y-auto bg-white">
                    <h1 className="text-2xl text-black font-bold mb-4">Your Students</h1>

                    <div className="w-full text-black">
                        {students.length === 0 ? (
                            <p>No students found that you advise.</p>
                        ) : (
                            <div className="space-y-4">
                                {students.map((student, index) => (
                                    console.log("Student:", student.student_id),
                                    <div key={index} className="bg-gray-200 p-4 mb-4 rounded-md shadow-sm">
                                        <h3 className="font-semibold text-black">{`${student.first_name} ${student.last_name}`}</h3>
                                        <p className="text-sm text-black">Graduation Year: {student.graduation_year !== null ? student.graduation_year : 'null'}</p>
                                        <p className="text-sm text-black">Degree Program: {student.degree_program !== null ? student.degree_program : 'null'}</p>

                                        {/* View Progress Button */}
                                        <Button
                                            onClick={() => router.push(`/advisor/student/${student.student_id}`)}
                                            variation="primary"
                                            className="bg-red-500 hover:bg-red-800 text-white font-bold py-4 px-2 mt-6 rounded nav-button"
                                            >
                                            View Progress
                                        </Button>

                                        <Button
                                            onClick={() => router.push(`/advisor/studentEnrollments/${student.student_id}`)}
                                            variation="primary"
                                            className="bg-red-500 hover:bg-red-800 text-white font-bold py-4 px-2 mt-6 rounded nav-button"
                                            >
                                            View Enrollments
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
};

export default ViewStudentsPage;
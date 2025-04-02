"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession, fetchUserAttributes } from "@aws-amplify/auth";
import { Amplify } from "aws-amplify";
import outputs from "../../../../aws-exports";

Amplify.configure(outputs);

const categoryLabels: Record<string, string> = {
  EE: "Electrical Engineering Courses",
  CE: "Computer Engineering Courses",
  ESD: "Engineering Science & Design",
  EFE: "ECE Electives",
  HUA: "Humanities & Arts",
  PE: "Physical Education",
  SS: "Social Sciences",
  MA: "Mathematics",
  PH: "Physics",
  CB: "Chemistry & Biology",
  MBS: "Math and Basic Science",
  CS: "Computer Science",
  AED: "Additional Engineering Design",
  FE: "Free Electives",
  MQP: "Major Qualifying Project",
  IQP: "Interactive Qualifying Project",
};

interface ProgressEntry {
  category: string;
  completed_courses_count: number;
  required_courses: number;
}

interface DegreeProgress {
  progress: ProgressEntry[];
  total_credits_completed: number;
}

const AdvisorProgressPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [degreeProgress, setDegreeProgress] = useState<DegreeProgress | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id; // Ensure id is a string

  const fetchStudentProgress = async (studentID: string) => {
    setLoading(true);
    try {
      console.log("Fetching progress for student ID:", studentID);
      const response = await fetch("https://nbnctbqpp0.execute-api.us-east-2.amazonaws.com/dev/student/viewProgress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wpiID: studentID }),
      });

      const data = await response.json();
      console.log("Response from progress API:", data);
      console.log("Received progress data:", data);

      if (data && data.body) {
        const parsedBody = JSON.parse(data.body);
        console.log("Parsed progress data:", parsedBody);
        setDegreeProgress(parsedBody);
      }
    } catch (error) {
      console.error("Error fetching student progress:", error);
    } finally {
      setLoading(false);
    }
  };

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

        if (accountTypeValue !== "advisor") {
          alert("Access Denied. Only advisors can view this page.");
          router.push("/");
          return;
        }

        if (id) {
          fetchStudentProgress(id);
        } else {
          console.error("Student ID is missing from the URL.");
        }
      } catch (error) {
        console.error("Error fetching session or attributes:", error);
        setIsAuthenticated(false);
        setAccountType(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [id, router]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-lg font-bold">Loading...</div>;
  }

  if (isAuthenticated === false || accountType !== "advisor") {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gray-600">
      {/* Main Content */}
      <div className="flex flex-col flex-grow">
        <header className="bg-red-600 w-full py-4 flex justify-between items-center px-6">
          <div className="text-white text-3xl font-bold">WPI Course Tracker</div>
        </header>

        {/* Nav Bar */}
        <div className="flex flex-col bg-red-00">
            <nav className="bg-gray-500 p-4 flex justify-center space-x-8 w-full">
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

        <div className="flex flex-col bg-white min-h-screen p-6">
          <h1 className="text-2xl text-black font-bold mb-4">Student Degree Progress</h1>

          {degreeProgress ? (
            <>
              <h2 className="text-xl text-black font-semibold mb-4">
                Total Credits Earned: <span className="text-red-700">{degreeProgress.total_credits_completed}</span>
              </h2>

              <div className="w-full max-w-8xl grid grid-cols-1 md:grid-cols-2 gap-6">
                {degreeProgress.progress.map((entry: ProgressEntry, index: number) => {
                  const progressPercentage = Math.min((entry.completed_courses_count / entry.required_courses) * 100, 100);

                  let progressColor = "bg-red-400";
                  if (progressPercentage === 100) progressColor = "bg-green-500";
                  else if (progressPercentage > 0) progressColor = "bg-orange-500";

                  return (
                    <div key={index} className="border-red-500 shadow-lg rounded-lg p-6">
                      <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold text-red-800">{categoryLabels[entry.category] || entry.category}</h2>
                        <span className="text-red-700 font-semibold text-sm">
                          {entry.completed_courses_count} / {entry.required_courses} Courses Completed
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 h-6 rounded-full overflow-hidden">
                        <div className={`h-full ${progressColor}`} style={{ width: `${progressPercentage}%` }}></div>
                      </div>
                      <p className="text-sm text-red-700 mt-2 font-semibold">{progressPercentage.toFixed(1)}% completed</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-700">No progress data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvisorProgressPage;

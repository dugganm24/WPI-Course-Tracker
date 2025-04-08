"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { Amplify } from 'aws-amplify';
import outputs from "../../../aws-exports";
import Select from 'react-select';

Amplify.configure(outputs);


const categoryLabels: Record<string, string> = {
    "EE": "Electrical Engineering Courses",
    "CE": "Computer Engineering Courses",
    "ESD": "Engineering Science & Design",
    "EFE": "ECE Electives",
    "SYS": "Systems Courses",
    "T&L": "Theory and Languages",
    "DE": "Design Courses",
    "SIC": "Social Implications of Computing Courses",
    "CSE": "Computer Science Core Courses",
    "BS": "Basic Science or Engineering Science Courses",
    "PB": "Probability Courses",
    "ST": "Statistics Courses",
    "AMA": "Aditional Math Courses",
    "ES": "Engineering Science Courses",
    "MS": "Mechanical Systems Courses",
    "AMS": "Aditional Mechanical Systems Course",
    "TS": "Thermal Systems Courses",
    "MEO": "Other Mechanical Engineering Courses",
    "MEE": "Mechancical Engineering Elective Courses",
    "S": "Science Courses",
    "HUA": "Humanities & Arts",
    "PE": "Physical Education",
    "SS": "Social Sciences",
    "MA": "Mathematics",
    "MMA": "Mathematics", 
    // For ME majors
    "PH": "Physics",
    "CB": "Chemistry & Biology",
    "MBS": "Math and Basic Science",
    "CS": "Computer Science",
    "AED": "Aditional Engineering Design",
    "FE": "Free Electives",
    "MQP": "Major Qualifying Project",
    "IQP": "Interactive Qualifying Project"
};

const categoryDescriptions: Record<string, string> = {
    "EE": "Must include 1 unit (9 Credits) of Electrical Engineering courses: ECE 2112, 2201, 2305, 2312, 3113, 3204, 3308, 3311, 3500, 3501, 3503, 4011, 4023, 4305, 4703, 4902, 4904, and ES 3011 ",
    "CE": "Must also include 2/3 unit (6 Credits) of Computer Engineering courses: ECE 2029, 2049, 3829, 3849, and 4801.",
    "ESD": "Must include at least 5 units at the 2000-level or higher within the Electrical and Computer Engineering area (including the MQP). All courses with prefix ECE at the 2000-level or higher and ES 3011 are applicable to these 5 units.",
    "EFE": "Additional Courses in Electrical & Computer Engineering.",

    "HUA": `All 5 HUA courses must be completed before beginning the Inquiry Seminar
    or Practicum Depth Component: Students must complete at least three thematically-related courses prior to the culminating Inquiry Seminar or Practicum in the same thematic area. At least one of the three courses should be at the 2000-level or above.
    Breadth Component: Breadth Component
    Students must take at least one course outside the grouping in which they
    complete their depth component. To identify breadth, courses are grouped in
    the following manner.
    i. art/art history, drama/theatre, and music (AR, EN/TH, MU);
    ii. foreign languages (AB, CN, EN, GN, SP);
    iii. literature and writing rhetoric (EN, WR, RH);
    iv. history and international studies (HI, HU, INTL);
    v. philosophy and religion (PY, RE).
    Exception: May take all six courses in a foreign language`,

    "PE": "4 PE classes = 1/3 unit. or 3 Credits",
    "SS": " (2/3 unit, 6 Credits) ECON, ENV, GOV, PSY, SD, SOC, SS, STS, DEV and ID2050",
    "MA": "(7/3 units, 21 Credits) Courses with prefix: MA",
    "AMA": "(6/3 units, 18 Credits) Courses with prefix: MA",
    "PH": "Physics classes related to fundamental science.",
    "CB": "(1/3 unit, 3 Credits) Course with prefix: CH or BB",
    "MBS": "(2/3 unit, 6 Credits) Courses with prefix: MA, PH, CH, BB, or GE",
    "CS": " (1/3 unit, 3 Credits) Either ECE 2039 or any 2000-level (or above) CS course except CS 2011, CS 2022, and CS 3043",
    "AED": "(2/3 unit, 6 Credits) Courses at the 2000 level or above from: AE, AREN, BME, CE, CHE, CS, ECE, ES, FP, ME or RBE, excluding CS 2011, CS 2022 and CS 3043 ",
    "FE": "Any course used as a free elective to fill credit requirements.",
    "MQP": "Major Qualifying Project — your senior capstone experience.",
    "IQP": "Interactive Qualifying Project — a humanities & social science project.",
    "SYS": "B. Must include at least 1/3 unit (CS 3013, CS 4513, CS 4515, CS 4516),",
    "T&L": "B. Must include at least 1/3 unit (CS 3133, CS 4120, CS 4123, CS 4533, CS 4536)",
    "DE": "B. Must include at least 1/3 unit (CS 3041, CS 3431, CS 3733, CS 4233",

    "SIC": `B. Must include at least 1/3 unit (CS 3043, GOV/ID 2314, GOV 2315, IMGD 2000, IMGD2001, RBE 3100). 
    (If GOV/ID 2314, GOV 2315, IMGD 2000, IMGD2001, or RBE 3100 is used to satisfy this requirement, it does not countas part of the 6 units of CS).`,

    "CSE": `A. Only CS 1101, CS 1102 and computer science courses at the 2000-level or higher will count 
    towards the computer science requirement.CS 2119 will not count towards the computer science requirement
    C. At least 5/3 units of the Computer Science requirement must consist of 4000-level or graduate CS courses, except for CS 5007. 
    D. Only one of CS 2301 and CS 2303 may count towards the computer science requirement. Only one of CS 2102, CS 210X, and 2103 may count towards the computer science requirement.
    : A cross-listed course may be counted toward only one of areas a, b, c above.`,

    "BS": `Courses satisfying the science requirement must come from the AE,
    BB, BME, CE, CH, CHE, ECE, ES, GE, ME, PH, RBE disciplines. At least three courses 
    must come from BB, CH, GE, PH, where at least two courses are from one of these disciplines`,

    "PB": "Must include at least 1/3 unit from Probability (MA 2621, MA 2631)",
    "ST": "Must include at least 1/3 unit from Statistics (MA 2611, MA 2612)",
    "MMA" : "(6/3 units) Must include Differential & Integral Calculus and Ordinary Differential Equations",
    "ES": "Courses satisfying the science requirement must come from the AE, BB, BME, CE, CH, CHE, ECE, ES, GE, ME, PH, RBE disciplines",

    "MS": ` Must include at least 3/3 unit from Mechanical Systems (ES 2501, ES 2502, ES 3503)`,
    "AMS" : "Must include at least 1/3 unit from Mechanical Systems (ME 4320, ME 4322, ME 4323, ME 4324, ME 4810)",
    "TS" : "Must include at least 4/3 unit from Thermal Systems (ES 3001, ES 3004, ES 3003, ME 4422, ME 4429)",
    "MEO" : "Must include at least 4/3 unit from Other Courses (ES 2002, ECE 2010, ME 3901, ME 3902, ME 2312, ME 4512, BME 1004, CS 1101, CS 1004)",
    "MEE" : `Note 1: Elective courses from engineering disciplines may be selected at the 2000 or higher level. They may also include ES and ME courses at the 1000 level. Note 2: ES 3001 can be replaced by CH 3510 or PH 2101. If CH or PH is
    used to cover thermodynamics, this course counts as a science; another
    engineering elective is then required.
    Note 3: ECE 2010 or any ECE course other than ECE 1799.`,
    "S": `(3/3 units) One Chemistry and two Physics, OR one Physics and two Chemistry`
};

const priorityOrder: Record<string, number> = {
    "EE": 1, "CE": 2, "ESD": 3, "EFE": 4, "SYS": 5, "T&L": 6, "DE": 7, "SIC": 8, "CSE": 9, "BS": 10,
    "PB": 11, "ST": 12, "AMA": 13, "ES": 14, "MS": 15, "AMS": 16, "TS": 17, "MEO": 18, "MEE": 19, "S": 20,
    "HUA": 21, "PE": 22, "SS": 23, "MA": 24, "MMA": 25, "PH": 26, "CB": 27, "MBS": 28, "CS": 29,
    "AED": 30, "FE": 31, "MQP": 32, "IQP": 33
  };
  

interface Course {
    enrollment_id: number;
    display_course_id: string;
    course_id: number;
    term: string | null;
    grade: string | null;
    course_title: string;
    credits: string;
    requirement_types: string[];
}

interface SuggestedCourse {
    id: number; // Primary key from DB
    course_id: string; // Display ID, e.g., ECE 2010
    course_name: string;
    requirement_type: string;
}

interface EnrollmentPayload {
    student_id: string;
    course_id: string;
    grade?: string; // Optional when removing
    action?: "remove"; // Optional unless removing
}

interface RequirementGroup {
    requirement_type: string;
    min_courses: number;
    courses: Course[];
}

interface SelectedCourseWithGrade {
    course: SuggestedCourse;
    grade: string;
}


const CoursesPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [accountType, setAccountType] = useState<string | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [studentID, setStudentID] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCourses, setSelectedCourses] = useState<Record<string, (SelectedCourseWithGrade | null)[]>>({});
    const [recommendations, setRecommendations] = useState<Record<string, SuggestedCourse[]>>({});
    const [requirementCounts, setRequirementCounts] = useState<Record<string, number>>({});
    const [groupedCourses, setGroupedCourses] = useState<Record<string, Course[]>>({});
    const [requirementMinimums, setRequirementMinimums] = useState<Record<string, number>>({});
    const [editedGrades, setEditedGrades] = useState<Record<number, string>>({});
    const [removedCourses, setRemovedCourses] = useState<Set<number>>(new Set());
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [advisorEmail, setAdvisorEmail] = useState<string | null>(null);
    const [messageText, setMessageText] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const router = useRouter();


    const fetchCourses = async (wpiID: string) => {
        try {
            const response = await fetch("https://3iws0uqwdl.execute-api.us-east-2.amazonaws.com/dev/student/viewEnrollments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentID: wpiID }),
            });

            const data = await response.json();
            const parsed: RequirementGroup[] = Array.isArray(data) ? data : JSON.parse(data.body);

            const allCourses: Course[] = [];
            const counts: Record<string, number> = {};
            const mins: Record<string, number> = {};

            const grouped: { [key: string]: Course[] } = {};

            parsed.forEach(group => {
                grouped[group.requirement_type] = group.courses;
                mins[group.requirement_type] = group.min_courses;
                counts[group.requirement_type] = group.courses.length;
                allCourses.push(...group.courses);
            });

            setCourses(allCourses);
            setGroupedCourses(grouped);
            setRequirementCounts(counts);
            setRequirementMinimums(mins);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const handleCourseSelect = (reqType: string, index: number, course: SuggestedCourse) => {
        const enrolledCount = groupedCourses[reqType]?.length || 0;
        const selectedCount = selectedCourses[reqType]?.filter(Boolean).length || 0;
        const required = requirementMinimums[reqType] || 0;

        if (enrolledCount + selectedCount >= required) {
            alert(`You have already fulfilled the ${categoryLabels[reqType] || reqType} requirement.`);
            return;
        }

        setSelectedCourses(prev => ({
            ...prev,
            [reqType]: prev[reqType].map((val, i) => i === index ? { course, grade: "" } : val)
        }));
    };

    const handleUndoSelect = (reqType: string, index: number) => {
        const removedCourse = selectedCourses[reqType]?.[index]?.course;

        setSelectedCourses(prev => ({
            ...prev,
            [reqType]: prev[reqType].map((val, i) => (i === index ? null : val))
        }));

        if (removedCourse) {
            setRecommendations(prev => ({
                ...prev,
                [reqType]: [...(prev[reqType] || []), removedCourse] // Optionally sort if needed
            }));
        }
    };

    const handleEnrollClick = async () => {
        if (!studentID) {
            alert("Missing student ID.");
            return;
        }

        const sid = studentID;
        const payload: EnrollmentPayload[] = [];

        // 1. Include newly selected courses
        for (const slots of Object.values(selectedCourses)) {
            slots.forEach((entry) => {
                if (entry) {
                    payload.push({
                        student_id: sid,
                        course_id: String(entry.course.id),
                        grade: entry.grade || "",
                    });
                }
            });
        }

        // 2. Include updated grades
        courses.forEach((course) => {
            const newGrade = editedGrades[course.enrollment_id];
            if (newGrade !== undefined && newGrade !== course.grade) {
                payload.push({
                    student_id: sid,
                    course_id: String(course.course_id),
                    grade: newGrade,
                });
            }
        });

        // 3. Include removals
        removedCourses.forEach((courseId) => {
            payload.push({
                student_id: sid,
                course_id: String(courseId),
                action: "remove",
            });
        });

        if (payload.length === 0) {
            alert("No changes or selections to enroll.");
            return;
        }

        try {
            const response = await fetch("https://jbyx6majpc.execute-api.us-east-2.amazonaws.com/dev/student/enrollStudent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enrollments: payload }),
            });

            const result = await response.json();

            if (!response.ok) {
                const errorMessage = result?.error || "Unknown error occurred.";
                throw new Error(errorMessage);
            }

            alert("Courses updated successfully.");

            // Clean up states
            setEditedGrades({});
            setRemovedCourses(new Set());

            // Remove enrolled from recommendations
            const enrolledCourseIds = new Set(payload.map(p => parseInt(p.course_id)));
            setRecommendations(prev => {
                const updated: typeof prev = {};
                for (const [reqType, recs] of Object.entries(prev)) {
                    updated[reqType] = recs.filter(course => !enrolledCourseIds.has(course.id));
                }
                return updated;
            });

            fetchCourses(studentID!); // Refresh
        } catch (error) {
            console.error("Enrollment failed:", error);
            alert("Failed to update courses.");
        }
    };


    const fetchAllRecommendations = useCallback(async () => {
        if (!studentID) return;

        try {
            const response = await fetch("https://89p1ojcq9g.execute-api.us-east-2.amazonaws.com/dev/student/recommendCourses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentID }),
            });

            const responseData = await response.json();

            // Explicitly handle both scenarios
            const parsed = responseData.body ? JSON.parse(responseData.body) : responseData;

            interface RecommendationResponse {
                coursesByRequirement: Record<string, Array<{
                    id: number;
                    course_id: string;
                    course_title?: string;
                }>>;
            }

            const recsByType: RecommendationResponse['coursesByRequirement'] = parsed.coursesByRequirement || {};

            const mapped: Record<string, SuggestedCourse[]> = {};
            for (const [reqType, recs] of Object.entries(recsByType)) {
                mapped[reqType] = recs.map((c) => ({
                    id: c.id,
                    course_id: c.course_id,
                    course_name: c.course_title || "Course Name",
                    requirement_type: reqType,
                }));
            }

            setRecommendations(mapped);
        } catch (err) {
            console.error("Failed to fetch recommendations:", err);
            setRecommendations({});
        }
    }, [studentID]);

    const fetchAdvisorAndSendMessage = async (sendMessage = false) => {
        if (!studentID) return;

        try {
            const response = await fetch("https://el96dlmu39.execute-api.us-east-2.amazonaws.com/dev/student/requestAdvisorHelp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    sendMessage
                        ? { studentID, messageBody: messageText }
                        : { studentID }
                ),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Request failed.");
            }

            if (!sendMessage) {
                setAdvisorEmail(data.advisorEmail);
                setShowMessageModal(true);
            } else {
                alert("Message sent successfully!");
                setShowMessageModal(false);
                setMessageText("");
            }
        } catch (err) {
            console.error("Error:", err);
            alert("Failed to send or fetch advisor email.");
        } finally {
            setSendingMessage(false);
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

                const attributes = await fetchUserAttributes();
                const wpiID = attributes["custom:wpiID"] || null;
                const accountTypeValue = attributes["custom:account_type"] || null;

                setStudentID(wpiID);
                setAccountType(accountTypeValue);
                setIsAuthenticated(true);

                if (wpiID) {
                    fetchCourses(wpiID);
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
        const initSelections = async () => {
            const init: Record<string, (SelectedCourseWithGrade | null)[]> = {};
            const reqTypes = Object.keys(requirementCounts);

            reqTypes.forEach((reqType) => {
                const enrolledCount = groupedCourses[reqType]?.length || 0;
                const totalNeeded = requirementMinimums[reqType] || 0;
                const emptySlots = Math.max(totalNeeded - enrolledCount, 0);

                // Don't allow selection of more than required
                init[reqType] = Array(emptySlots).fill(null);
            });

            setSelectedCourses(init);
            await fetchAllRecommendations();
        };

        initSelections();
    }, [groupedCourses, requirementMinimums, requirementCounts, fetchAllRecommendations]);

    const sortedRequirementTypes = Object.keys(requirementCounts).sort(
        (a, b) => (priorityOrder[a] || 99) - (priorityOrder[b] || 99)
    );

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



    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="bg-red-600 w-full py-4 px-6 text-white text-3xl font-bold">
                WPI Course Tracker
            </header>

            {/* Nav Bar */}
            <nav className="bg-gray-300 p-4 flex justify-center space-x-8 w-full mb-6">
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

            <div className="flex justify-between items-center mb-6 px-2">
                <h1 className="text-3xl font-bold text-red-700">My Enrolled Courses</h1>
                <div className="flex space-x-4">
                    <Button
                        className="nav-button"
                        onClick={handleEnrollClick}
                    >
                        Update Courses
                    </Button>
                    <Button
                        className="nav-button"
                        onClick={() => fetchAdvisorAndSendMessage(false)}
                    >
                        Message My Advisor
                    </Button>
                </div>
            </div>

            {showMessageModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
                        <h2 className="text-lg font-bold mb-2 text-red-600">Message Your Advisor</h2>
                        <p className="text-sm mb-2 text-gray-600">
                            <strong>To:</strong> {advisorEmail || "Loading..."}
                        </p>
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Write your message here..."
                            className="w-full h-32 border border-gray-300 rounded p-2 mb-4 text-black"
                        />
                        <div className="flex justify-end space-x-4">
                            <button
                                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                                onClick={() => setShowMessageModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                disabled={sendingMessage || !messageText.trim()}
                                onClick={() => {
                                    setSendingMessage(true);
                                    fetchAdvisorAndSendMessage(true);
                                }}
                            >
                                {sendingMessage ? "Sending..." : "Send"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Course Sections */}
            <div className="mt-6">
                {sortedRequirementTypes.map((reqType) => {
                    const enrolled = groupedCourses[reqType] || [];
                    const remaining = selectedCourses[reqType] || [];

                    return (
                        <div key={reqType} className="mb-10 px-2">
                            <h2 className="text-xl font-bold text-red-800 mb-3">
                                {categoryLabels[reqType] || reqType} ({enrolled.length + remaining.filter(Boolean).length}/{requirementMinimums[reqType] || 0})
                            </h2>
                            <p className="text-sm text-gray-600 italic mb-4">
                                {categoryDescriptions[reqType] || ""}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {enrolled.map((course) => (
                                    <div key={course.enrollment_id} className={`border-l-4 shadow rounded p-4 w-full
                                        ${removedCourses.has(course.course_id) ? 'bg-red-100 border-red-700' : 'bg-gray-100 border-red-500'}
                                    `}>
                                        <h3 className={`font-bold text-red-700 ${removedCourses.has(course.course_id) ? 'line-through' : ''}`}>{course.display_course_id}</h3>
                                        <p className="text-sm text-black">{course.course_title}</p>
                                        <p className="text-sm text-black">Term: {course.term}</p>
                                        <p className="text-sm text-black">Credits: {course.credits}</p>

                                        {/* Grade input for editing */}
                                        <div className="mt-2">
                                            <label className="text-sm text-black font-semibold mr-2">Grade:</label>
                                            <input
                                                type="text"
                                                value={editedGrades[course.enrollment_id] ?? course.grade ?? ""}
                                                onChange={(e) => {
                                                    const newGrade = e.target.value;
                                                    setEditedGrades(prev => ({
                                                        ...prev,
                                                        [course.enrollment_id]: newGrade
                                                    }));
                                                }}
                                                className="p-1 border rounded text-sm text-black w-20"
                                                placeholder="Grade"
                                            />
                                            <button
                                                className="mt-2 text-md text-red-600 hover:underline px-8"
                                                onClick={() => {
                                                    setRemovedCourses((prev) => {
                                                        const updated = new Set(prev);
                                                        if (updated.has(course.course_id)) {
                                                            updated.delete(course.course_id); // Undo remove
                                                        } else {
                                                            updated.add(course.course_id); // Mark for removal
                                                        }
                                                        return updated;
                                                    });
                                                }}
                                            >
                                                {removedCourses.has(course.course_id) ? "Undo Remove" : "Remove Course"}
                                            </button>
                                        </div>
                                    </div>
                                ))}




                                {/* Recomended Slot section */}
                                {remaining.map((selected, i) => (
                                    <div key={i} className="bg-gray-300 border-l-4 border-dashed border-gray-500 rounded p-8 flex flex-col items-center">
                                        {selected ? (
                                            <>
                                                <div className="text-black font-medium mb-2 text-center">
                                                    {selected.course.course_name}
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Enter grade"
                                                    value={selected.grade}
                                                    onChange={(e) => {
                                                        const newGrade = e.target.value;
                                                        setSelectedCourses((prev) => ({
                                                            ...prev,
                                                            [reqType]: prev[reqType].map((val, j) =>
                                                                j === i && val ? { ...val, grade: newGrade } : val
                                                            ),
                                                        }));
                                                    }}
                                                    className="mt-2 p-1 border rounded text-sm text-black"
                                                />
                                                <button
                                                    className="text-sm text-red-600 hover:underline mt-2"
                                                    onClick={() => handleUndoSelect(reqType, i)}
                                                >
                                                    Undo
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <label className="text-gray-800 italic mb-2">Empty Slot</label>
                                                <div className="w-full">
                                                    <Select
                                                        options={(recommendations[reqType] || []).map((course) => ({
                                                            value: course.course_id,
                                                            label: `${course.course_id} - ${course.course_name}`,
                                                            course,
                                                        }))}
                                                        onChange={(option) => {
                                                            if (option && option.course) {
                                                                handleCourseSelect(reqType, i, option.course);
                                                                setRecommendations((prev) => ({
                                                                    ...prev,
                                                                    [reqType]: prev[reqType].filter(
                                                                        (c) => c.course_id !== option.course.course_id
                                                                    ),
                                                                }));
                                                            }
                                                        }}
                                                        className="text-sm text-black"
                                                        classNamePrefix="react-select"
                                                        placeholder="Search or select a course..."
                                                        isClearable
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div >
        </div >
    );
};


export default CoursesPage;

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { Amplify } from 'aws-amplify';
import Select from 'react-select';
import outputs from "../../../../aws-exports";

Amplify.configure(outputs);


const categoryLabels: Record<string, string> = {
    "EE": "Electrical Engineering Courses",
    "CE": "Computer Engineering Courses",
    "ESD": "Engineering Science & Design",
    "EFE": "ECE Electives",
    "HUA": "Humanities & Arts",
    "PE": "Physical Education",
    "SS": "Social Sciences",
    "MA": "Mathematics",
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
    "PH": "Physics classes related to fundamental science.",
    "CB": "(1/3 unit, 3 Credits) Course with prefix: CH or BB",
    "MBS": "(2/3 unit, 6 Credits) Courses with prefix: MA, PH, CH, BB, or GE",
    "CS": " (1/3 unit, 3 Credits) Either ECE 2039 or any 2000-level (or above) CS course except CS 2011, CS 2022, and CS 3043",
    "AED": "(2/3 unit, 6 Credits) Courses at the 2000 level or above from: AE, AREN, BME, CE, CHE, CS, ECE, ES, FP, ME or RBE, excluding CS 2011, CS 2022 and CS 3043 ",
    "FE": "Any course used as a free elective to fill credit requirements.",
    "MQP": "Major Qualifying Project — your senior capstone experience.",
    "IQP": "Interactive Qualifying Project — a humanities & social science project."
};

const priorityOrder: Record<string, number> = {
    "EE": 1, "CE": 2, "ESD": 3, "EFE": 4, "HUA": 5, "PE": 6,
    "SS": 7, "MA": 8, "PH": 9, "CB": 10, "MBS": 11, "CS": 12,
    "AED": 13, "FE": 14, "MQP": 15, "IQP": 16
};

interface Course {
    enrollment_id: number;
    display_course_id: string;
    course_id: number;
    term: string | null;
    grade: string | null;
    course_section_owner: string;
    academic_units: string;
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
    const router = useRouter();
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id; // Ensure id is a string
    
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

    // const fetchRecommendedForType = async (reqType: string) => {
    //     console.log("StudentID:", studentID);
    //     if (!studentID || recommendations[reqType]) return;
    //     try {
    //         const response = await fetch("https://89p1ojcq9g.execute-api.us-east-2.amazonaws.com/dev/student/recommendCourses", {
    //             method: "POST",
    //             headers: { "Content-Type": "application/json" },
    //             body: JSON.stringify({
    //                 studentID,
    //                 requirementType: reqType,
    //             }),
    //         });

    //         const data = await response.json();
    //         const parsed = data.body ? JSON.parse(data.body) : data;

    //         if (Array.isArray(parsed.courses)) {
    //             setRecommendations(prev => ({
    //                 ...prev,
    //                 [reqType]: parsed.courses.map((c: { id: number; course_id: string; course_section_owner?: string }) => ({
    //                     id: c.id,
    //                     course_id: c.course_id,
    //                     course_name: c.course_section_owner || "Course Name",
    //                     requirement_type: reqType,
    //                 }))
    //             }));
    //         } else {
    //             setRecommendations(prev => ({ ...prev, [reqType]: [] }));
    //         }
    //     } catch (err) {
    //         console.error(`Failed to fetch recommendations for ${reqType}:`, err);
    //         setRecommendations(prev => ({ ...prev, [reqType]: [] }));
    //     }
    // };

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
                // const wpiID = attributes["custom:wpiID"] || null;
                const accountTypeValue = attributes["custom:account_type"] || null;

                setAccountType(accountTypeValue);
                setIsAuthenticated(true);

                if (id) {
                    console.log("Student ID from URL:", id);
                    setStudentID(id);
                    fetchCourses(id);
                } else {
                    console.error("Student ID is missing from the URL.");
                }

                if (studentID) {
                    fetchCourses(studentID);
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

    useEffect(() => {
            const initSelections = async () => {
              const init: Record<string, (SelectedCourseWithGrade | null)[]> = {};
              const reqTypes = Object.keys(requirementCounts);
              reqTypes.forEach((reqType) => {
                const enrolledCount = groupedCourses[reqType]?.length || 0;
                const totalNeeded = requirementMinimums[reqType] || 0;
                const emptySlots = Math.max(totalNeeded - enrolledCount, 0);
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
            } else if (isAuthenticated && accountType === "student") {
                alert("Access Denied, must have a valid student account to reach this page");
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
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="bg-red-600 w-full py-4 px-6 text-white text-3xl font-bold">
                WPI Course Tracker
            </header>

            {/* Nav Bar */}
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

            {/* Enroll Header */}
            <div className="flex justify-between items-center mb-6 px-2">
                <h1 className="text-3xl font-bold text-red-700 py-2">My Enrolled Courses</h1>
                <Button
                    className="bg-red-600 hover:bg-red-800 text-white font-semibold nav-button"
                    onClick={handleEnrollClick}>
                    Update Courses
                </Button>
            </div>

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
                                        <h3 className="font-bold text-red-700">{course.display_course_id}</h3>
                                        <p className="text-sm text-black">{course.course_section_owner}</p>
                                        <p className="text-sm text-black">Term: {course.term}</p>
                                        <p className="text-sm text-black">Units: {course.academic_units}</p>

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



                                {/* Recommended Slot Selections */}
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
            </div>
        </div>
    );
};


export default CoursesPage;

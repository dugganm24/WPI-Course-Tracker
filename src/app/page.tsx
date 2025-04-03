"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Authenticator,
  View,
  Text,
  Button,
  RadioGroupField,
  Radio,
  useAuthenticator,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import outputs from "../aws-exports.js";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

Amplify.configure(outputs);

const AuthenticatedUserActions = () => {

  const { user, signOut } = useAuthenticator();

  async function currentSession() {
    try {
      const { accessToken, idToken } = (await fetchAuthSession()).tokens ?? {};
      console.log("Access Token:", accessToken);
      console.log("ID Token:", idToken);
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = await getCurrentUser();
        const userAttributes = await fetchUserAttributes();
        console.log("Email:", userAttributes.email);
        const accountType = userAttributes["custom:account_type"];
        const wpiID = userAttributes["custom:wpiID"];
        console.log("Account Type:", accountType);
        console.log("First Name:", userAttributes.given_name);
        console.log("Last Name:", userAttributes.family_name);
        console.log("User Attributes:", userAttributes);

        console.log("User data:", {
          username: currentUser.username,
          email: userAttributes.email ?? null,
          firstName: userAttributes.given_name ?? null,
          lastName: userAttributes.family_name ?? null,
          accountType: accountType ?? null,
          wpiID: wpiID ?? 0,
        });

        currentSession();
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUserData();
  },);

  if (!user) return null;

  return (
    <div className="flex items-center">
      <span className="text-white mr-4">Hello, {user.username}!</span>
      <button
        onClick={signOut}
        className="bg-white text-red-600 font-bold py-2 px-4 rounded hover:bg-gray-200"
      >
        Sign Out
      </button>
    </div>
  );
};

const StudentNavigation = () => {
  const router = useRouter();
  return (
    <nav className="flex flex-col bg-red-00 w-screen">
      <div className="bg-gray-300 p-4 flex justify-center space-x-8 w-full">
        <Button
          onClick={() => router.push("/")}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded nav-button"
        >
          Home
        </Button>
        <Button
          onClick={() => router.push("/student/courses")}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded nav-button"
        >
          My Courses
        </Button>
        <Button
          onClick={() => router.push("/student/progress")}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded nav-button"
        >
          My Progress
        </Button>
        <Button
          onClick={() => router.push("/student/allcourses")}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded nav-button"
        >
          All Courses
        </Button>
      </div>
    </nav>
  );
};

const AdvisorNavigation = () => {
  const router = useRouter();
  return (
    <div className="flex flex-col bg-red-00 w-screen">
      <nav className="bg-gray-200 p-4 flex justify-center space-x-8 w-full">
        <Button
          onClick={() => router.push("/")}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded nav-button"
        >
          Home
        </Button>
        <Button
          onClick={() => router.push("/advisor/students")}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded nav-button"
        >
          Students
        </Button>
      </nav>
    </div>
  );
};

const UserNavigation = () => {
  const { user } = useAuthenticator();
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccountType = async () => {
      try {
        const userAttributes = await fetchUserAttributes();
        const accountTypeValue = userAttributes["custom:account_type"];
        setAccountType(accountTypeValue ?? null);
      } catch (error) {
        console.error("Error fetching account type:", error);
      }
    };

    if (user) {
      fetchAccountType();
    }
  }, [user]);

  if (!user || !accountType) return null;

  return (
    <>
      {accountType === "student" && <StudentNavigation />}
      {accountType === "advisor" && <AdvisorNavigation />}
    </>
  );
};

//   return (
//     <div className="flex flex-col bg-red-00 min-h-screen">
//       <nav className="bg-gray-500 p-4 flex justify-center space-x-8 w-full">
//         <Button
//           onClick={() => (window.location.href = "/")}
//           variation="primary"
//           className="bg-red-500 hover:bg-red-900 text-white font-bold py-2 px-4 rounded nav-button"
//         >
//           Home
//         </Button>
//         <Button
//           onClick={() =>
//             router.push(accountType === "student" ? "/student/courses" : "/advisor/courses")
//           }
//           variation="primary"
//           className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button"
//         >
//           My Courses
//         </Button>
//         <Button
//           onClick={() =>
//             router.push(accountType === "student" ? "/student/progress" : "/advisor/progress")
//           }
//           variation="primary"
//           className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button"
//         >
//           My Progress
//         </Button>
//         <Button
//           onClick={() =>
//             router.push(accountType === "student" ? "/student/allcourses" : "/advisor/allcourses")
//           }
//           variation="primary"
//           className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button"
//         >
//           All Courses
//         </Button>
//       </nav>
//     </div>
//   );
// };

const SignUpFormFields = ({ updateForm }: { updateForm: (field: string, value: string) => void }) => {
  const { validationErrors } = useAuthenticator();
  const [formData, setFormData] = useState({
    username: "",
    given_name: "",
    family_name: "",
    email: "",
    password: "",
    accountType: "",
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    updateForm(field, value);
  };

  return (
    <>
      <Authenticator.SignUp.FormFields />
      <RadioGroupField
        legend="Select Account Type"
        name="custom:account_type"
        isRequired
        value={formData.accountType}
        onChange={(e) => handleChange("accountType", e.target.value)}
        errorMessage={validationErrors.account_type as string}
        hasError={!!validationErrors.account_type}
      >
        <Radio value="student">Student</Radio>
        <Radio value="advisor">Advisor</Radio>
      </RadioGroupField>
    </>
  );
};

const components = {
  Header() {
    return <View textAlign="center"></View>;
  },
  Footer() {
    return (
      <View textAlign="center" padding="20px">
        <Text>&copy; All Rights Reserved</Text>
      </View>
    );
  },
  SignIn: {
    Footer() {
      const { toForgotPassword } = useAuthenticator();
      return (
        <View textAlign="center">
          <Button onClick={toForgotPassword} size="small" variation="link">
            Reset Password
          </Button>
        </View>
      );
    },
  },
  SignUp: {
    FormFields: () => <SignUpFormFields updateForm={() => { }} />,
    Footer() {
      const { toSignIn } = useAuthenticator();
      return (
        <View textAlign="center">
          <Button onClick={toSignIn} size="small" variation="link">
            Back to Sign In
          </Button>
        </View>
      );
    },
  },
};

const formFields = {
  signIn: {
    username: {
      placeholder: 'Enter your Username',
    },
  },
  signUp: {
    given_name: {
      label: 'First Name:',
      placeholder: 'Enter your First name',
      isRequired: false,
    },
    family_name: {
      label: 'Last Name:',
      placeholder: 'Enter your Last Name',
      isRequired: false,
    },
    "custom:wpiID": {
      label: 'WPI ID:',
      placeholder: 'Enter your WPI ID',
      isRequired: true,
    },

  }
};

const PostLoginIntro = () => {
  const { user } = useAuthenticator();

  if (!user) return null;
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-center text-4xl font-semibold mb-2 text-black my-2">Welcome to the WPI Course Tracker!</h2>
      <p className="text-center text-gray-700">
        This app helps you track your enrolled courses, monitor your academic progress, and explore all available courses at WPI. Use the navigation above to plan your degree, manage your learning path, and ensure you meet all requirements.
      </p>
      <p className="text-center text-gray-700 mb-4 my-4">
        If you have any questions or need assistance, please reach out to your academic advisor.
      </p>

      <p className="text-center text-gray-700 mb-4 my-4">
        Please reach out to William Tyrrell at wftyrrell64@gmail.com or Michael Duggan at mpduggan97@gmail.com to report bugs, request features, or provide feedback. Thank you!
      </p>
    </div>
  );
};


export default function App() {
  return (
    <Authenticator.Provider>
      
      <div className="min-h-screen flex flex-col bg-white">
        <header className="bg-red-600 w-full py-4 flex justify-between items-center px-6">
          <div className="text-white text-3xl font-bold">WPI Course Tracker</div>
          <AuthenticatedUserActions />
        </header>

        <UserNavigation />
        <PostLoginIntro />
        

        <div className="flex flex-col justify-center items-center flex-grow">
          <div className="max-w-md w-full flex flex-col items-center">
            <Authenticator initialState="signIn" components={components} formFields={formFields} className="w-full" />
          </div>
        </div>
      </div>
    </Authenticator.Provider>
  );
}




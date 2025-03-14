"use client";

import React, { useEffect, useState, useCallback } from 'react';
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

// Check if the files exist
// import fs from "fs";
// console.log(fs.existsSync("../amplifyconfiguration.json")); // Should print true
// console.log(fs.existsSync("../aws-exports.js")); // Should print true


import config from "../aws-exports.js";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import outputs from '../aws-exports';

// import { jwtDecode, JwtPayload } from "jwt-decode";

Amplify.configure(config);

// function getUsernameFromToken(idToken: string) {
//   if (idToken) {
//       const decoded = jwtDecode<JwtPayload & { "cognito:username": string }>(idToken);
//       return decoded["cognito:username"];
//   }
//   return null;
// }


const AuthenticatedUserActions = () => {;
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

  interface UserData {
    username: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    accountType: string | null;
  }

  const sendUserDataToBackend = useCallback(async (userData: UserData): Promise<void> => {
    try {
      const response = await fetch(
        "https://4o8m1mc4cg.execute-api.us-east-2.amazonaws.com/dev/openStudentAccount",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();
      console.log("Lambda Response:", data);
    } catch (error) {
      console.error("Error sending data to Lambda:", error);
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = await getCurrentUser();
        const userAttributes = await fetchUserAttributes();
        console.log("Email:", userAttributes.email);
        const accountType = userAttributes["custom:account_type"];
        console.log("Account Type:", accountType);
        console.log("First Name:", userAttributes.given_name);
        console.log("Last Name:", userAttributes.family_name);
        console.log("User Attributes:", userAttributes);

        const userData = {
          username: currentUser.username,
          email: userAttributes.email ?? null,
          firstName: userAttributes.given_name ?? null,
          lastName: userAttributes.family_name ?? null,
          accountType: accountType ?? null,
        };

        // Call Lambda function with user data
        await sendUserDataToBackend(userData);

        currentSession();
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUserData();
  }, [sendUserDataToBackend]);

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

const UserNavigation = () => {
  const router = useRouter();
  const { user } = useAuthenticator();
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccountType = async () => {
      try {
        const userAttributes = await fetchUserAttributes();
        const accountTypeValue = userAttributes["custom:account_type"];
        setAccountType(accountTypeValue ?? null);
        console.log("Fetched Account Type:", accountTypeValue);
      } catch (error) {
        console.error("Error fetching account type:", error);
      }
    };

    if (user) {
      fetchAccountType();
    }
  }, [user]);

  if (!user || !accountType) return null; // Ensures the navigation loads only when accountType is available

  return (
    <div className="flex flex-col bg-red-00 min-h-screen">
      <nav className="bg-gray-500 p-4 flex justify-center space-x-8 w-full">
        <Button
          onClick={() => router.push("/")}
          variation="primary"
          className="bg-red-500 hover:bg-red-900 text-white font-bold py-2 px-4 rounded nav-button"
        >
          Home
        </Button>
        <Button
          onClick={() =>
            router.push(accountType === "student" ? "/student/courses" : "/advisor/courses")
          }
          variation="primary"
          className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button"
        >
          My Courses
        </Button>
        <Button
          onClick={() =>
            router.push(accountType === "student" ? "/student/progress" : "/advisor/progress")
          }
          variation="primary"
          className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button"
        >
          My Progress
        </Button>
        <Button
          onClick={() =>
            router.push(accountType === "student" ? "/student/allcourses" : "/advisor/allcourses")
          }
          variation="primary"
          className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded nav-button"
        >
          All Courses
        </Button>
      </nav>
    </div>
  );
};

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
      placeholder: 'Enter your email',
    },
  },
  signUp: {
    given_name: {
      label: 'First Name:',
      placeholder: 'Enter your first name',
      isRequired: false,
    },
    family_name: {
      label: 'Family Name:',
      placeholder: 'Enter your Last Name',
      isRequired: false,
    },
  }
};

export default function App() {
  return (
    <Authenticator.Provider>
      <div className="min-h-screen flex flex-col bg-red-100">
        <header className="bg-red-600 w-full py-4 flex justify-between items-center px-6 mb-4">
          <div className="text-white text-3xl font-bold">WPI Course Tracker</div>
          <AuthenticatedUserActions />
        </header>
        <div className="flex flex-col justify-center items-center flex-grow">
          <div className="max-w-md w-full flex flex-col items-center">
            <Authenticator initialState="signIn" components={components} formFields={formFields} className="w-full" />
            <UserNavigation />
          </div>
        </div>
      </div>
    </Authenticator.Provider>
  );
}




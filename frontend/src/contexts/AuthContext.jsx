import { Children, createContext, useContext, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import httpStatus from "http-status";
import server from "../environment";  
export const AuthContext = createContext({});
const client = axios.create({
  baseURL: `${server}/api/v1/users`
  })

const getAuthConfig = () => {
  // Backend now expects JWT in Authorization header.
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const AuthProvider = ({ children }) => {
  const authContext = useContext(AuthContext);
  const [userData, setUserData] = useState(authContext);

  const router = useNavigate();

  const handleRegister = async (email, username, password) => {
    try {
      let request = await client.post("/register", {
        email: email,
        username: username,
        password: password,
      });

      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (err) {
      throw err;
    }
  };

  const handleLogin = async (email, password) => {
    try {
      let request = await client.post("/login", {
        email: email,
        password: password,
      });
      if (request.status === httpStatus.OK) {
        localStorage.setItem("token", request.data.token);
         router("/home");
      }
    } catch (err) {
      throw err;
    }
  };

  const getHistoryOfUser = async () => {
    try {
      let request = await client.get("/get_all_activity", getAuthConfig());
      return request.data;
    } catch (err) {
      throw err;
    }
  };
  const addToUserHistory = async (meetingCode) => {
    try {
      let request = await client.post(
        "/add_to_activity",
        {
          meeting_code: meetingCode,
        },
        getAuthConfig()
      );
      return request;
    } catch (e) {
      throw e;
    }
  };
  const data = {
    userData,
    setUserData,
    addToUserHistory,
    getHistoryOfUser,
    handleRegister,
    handleLogin,
  };
  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};

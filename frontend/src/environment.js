// CRA exposes only REACT_APP_* variables to browser code.
const server = process.env.REACT_APP_SERVER_URL || "http://localhost:8000";
export default server;
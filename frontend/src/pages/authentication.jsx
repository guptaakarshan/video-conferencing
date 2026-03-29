import * as React from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AuthContext } from "../contexts/AuthContext";
import { Snackbar } from "@mui/material";
import { useNavigate } from "react-router-dom";
import bg from "../assets/loginbackground.jpg";

export default function Authentication() {
  const defaultTheme = createTheme();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [formState, setFormState] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  const isValidEmail = (value) => {
    // Simple RFC-like email check for client-side validation.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleAuth = async () => {
    try {
      if (formState === 0) {
        if (!isValidEmail(email)) {
          setError("Please enter a valid email address");
          return;
        }

        await handleLogin(email, password);
      }
      if (formState === 1) {
        if (!isValidEmail(email)) {
          setError("Please enter a valid email address");
          return;
        }

        let result = await handleRegister(email, username, password);
        console.log(result);
        setMessage(result);
        setOpen(true);
        setError("");
        setFormState(0);
        setUsername("");
        setPassword("");
        setEmail("");
      }
    } catch (err) {
      console.log(err);
      let message = err.response?.data?.message || "An error occurred";
      setError(message);
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid
        container
        component="main"
        sx={{
          minHeight: "100vh",
          // inside sx/backgroundImage
          backgroundImage: `url(${bg})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <CssBaseline />

        <Grid
          item
          xs={12}
          sm={4}
          md={7}
          sx={{ minHeight: "100vh", display: { xs: "none", sm: "block" } }}
        />

        <Grid
          item
          xs={12}
          sm={6}
          md={5}
          component={Paper}
          elevation={6}
          square
          sx={{ backgroundColor: "rgba(255,255,255,0.9)" }}
        >
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
              <LockOutlinedIcon />
            </Avatar>

            <div>
              <Button
                variant={formState === 0 ? "contained" : "text"}
                onClick={() => {
                  setFormState(0);
                  setEmail("");
                  setUsername("");
                  setPassword("");
                  setError("");
                }}
              >
                Sign In
              </Button>
              <Button
                variant={formState === 1 ? "contained" : "text"}
                onClick={() => {
                  setFormState(1);
                  setEmail("");
                  setUsername("");
                  setPassword("");
                  setError("");
                }}
              >
                Sign Up
              </Button>
            </div>

            <Box component="form" noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email"
                type="email"
                value={email}
                autoFocus
                error={email.length > 0 && !isValidEmail(email)}
                helperText={
                  email.length > 0 && !isValidEmail(email)
                    ? "Enter a valid email"
                    : ""
                }
                onChange={(e) => setEmail(e.target.value)}
              />

              {formState === 1 && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <p style={{ color: "red" }}>{error}</p>

              <Button
                type="button"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={handleAuth}
              >
                {formState === 0 ? "Login" : "Register"}
              </Button>

              <Button
                type="button"
                fullWidth
                variant="outlined"
                sx={{ mb: 1 }}
                onClick={() => navigate("/")}
              >
                Go to Home
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={open} autoHideDuration={4000} message={message} />
    </ThemeProvider>
  );
}

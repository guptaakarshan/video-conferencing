import './App.css';
import LandingPage from './pages/landing';
import {Route, BrowserRouter as Router, Routes} from 'react-router-dom';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';

function App() {
  return (
    <div className='App'>

      <Router>
    <AuthProvider>
        <Routes>
          <Route path='/' element={<LandingPage/>}/>
          <Route path='/home' element={<HomeComponent />} />
          <Route path='/auth' element={<Authentication/>}/>
          <Route path='/:url' element={<VideoMeetComponent/>}/>
          <Route path='/history' element={<History/>}/>
        </Routes>
    </AuthProvider>
      </Router>

    </div>
  );
}

export default App;

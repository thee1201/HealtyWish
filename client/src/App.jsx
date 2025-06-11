import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Start from './pages/Start'
import Main from './pages/Main'
import Auth from './pages/Auth'
import Post from './pages/Post'
import Chat from './pages/Chat'
import NewPost from './pages/NewPost'
import Profile from './pages/Profile'
import Notice from './pages/Notice'
import Rules from './pages/Rules'
import Admin from './pages/Admin'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/main" element={<Main />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/post/:id" element={<Post />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/new-post" element={<NewPost />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notice" element={<Notice />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App

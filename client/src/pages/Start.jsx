import '../styles/Start.css'
import { useNavigate } from 'react-router-dom'

function Start() {
  const navigate = useNavigate()

  return (
    <div className="home">
      <button className="start-btn" onClick={() => navigate('/Auth')}>
        start
      </button>
    </div>
  )
}

export default Start
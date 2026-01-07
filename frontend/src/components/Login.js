import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'; // Import framer-motion
import { loginUser } from '../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import './Login.css'; // Import the new CSS

const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Display session expired message
  useEffect(() => {
    const expiredMessage = localStorage.getItem('sessionExpiredMessage');
    if (expiredMessage) {
      setError(expiredMessage);
      localStorage.removeItem('sessionExpiredMessage');
    }
  }, []);

  // CAPTCHA state
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState(0);
  const [userCaptchaAnswer, setUserCaptchaAnswer] = useState('');

  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion(`${num1} + ${num2}`); // Removed " = ?" as it's in the label
    setCaptchaAnswer(num1 + num2);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Effect to manage theme class on body and data-bs-theme attribute
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((curr) => (curr === 'light' ? 'dark' : 'light'));
  };

  const handleCaptchaChange = (e) => {
    setUserCaptchaAnswer(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (parseInt(userCaptchaAnswer) !== captchaAnswer) {
      setError('Respuesta CAPTCHA incorrecta.');
      generateCaptcha(); // Generate a new CAPTCHA on failure
      setUserCaptchaAnswer(''); // Clear user's answer
      return;
    }

    try {
      const data = await loginUser(usernameOrEmail, password);
      localStorage.setItem('token', data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.message);
      generateCaptcha(); // Also generate a new captcha on login failure
      setUserCaptchaAnswer('');
    }
  };

  return (
    <div className="login-background d-flex justify-content-center align-items-center">
      <motion.div 
        className="col-md-6 col-lg-4 mx-auto"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex justify-content-end mb-3">
              <button
                className="btn btn-link text-decoration-none"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} size="lg" />
              </button>
            </div>
            <h2 className="card-title text-center mb-4">Iniciar Sesión</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="usernameOrEmailInput" className="form-label">Usuario o Email</label>
                <input
                  type="text"
                  id="usernameOrEmailInput"
                  className="form-control"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  placeholder="usuario o tu@email.com"
                  autoComplete="username"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="passwordInput" className="form-label">Contraseña</label>
                <input
                  type="password"
                  id="passwordInput"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="********"
                  autoComplete="current-password"
                />
              </div>
              {/* CAPTCHA */}
              <div className="mb-3">
                <label htmlFor="captchaInput" className="form-label">
                  CAPTCHA: ¿Cuánto es {captchaQuestion} = ?
                </label>
                <input
                  type="text"
                  id="captchaInput"
                  className="form-control"
                  value={userCaptchaAnswer}
                  onChange={handleCaptchaChange}
                  required
                />
              </div>
              {error && <div className="alert alert-danger mt-3">{error}</div>}
              <div className="d-grid">
                <motion.button 
                  type="submit" 
                  className="btn btn-primary mt-3"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Entrar
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
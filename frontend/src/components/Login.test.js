import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Login from './Login';
import { loginUser } from '../api';
import { toast } from 'react-toastify';

// Mock the API calls
jest.mock('../api', () => ({
  loginUser: jest.fn(),
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Mock useNavigate
const mockedUseNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedUseNavigate,
}));

describe('Login Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    loginUser.mockClear();
    mockedUseNavigate.mockClear();
    toast.error.mockClear();
    localStorage.clear();
  });

  test('renders email and password input fields and a login button', () => {
    render(
      <Router>
        <Login />
      </Router>
    );

    // Check if email input is present
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    // Check if password input is present
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    // Check if login button is present
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  test('updates input fields on change', () => {
    render(
      <Router>
        <Login />
      </Router>
    );

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  test('navigates to dashboard on successful login', async () => {
    loginUser.mockResolvedValueOnce({ access_token: 'fake-token' });

    render(
      <Router>
        <Login />
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token');
      expect(mockedUseNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('displays error message on failed login', async () => {
    loginUser.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(
      <Router>
        <Login />
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/correo electrónico/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith('wrong@example.com', 'wrongpass');
      expect(toast.error).toHaveBeenCalledWith('Error de inicio de sesión: Invalid credentials');
      expect(mockedUseNavigate).not.toHaveBeenCalled();
    });
  });
});

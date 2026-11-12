
import { useState } from 'react';
import { apiRequest } from '../services/api';

function Auth({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);

        try {
            if (isLogin) {
                const data = await apiRequest('/users/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                localStorage.setItem('token', data.token);
                onLoginSuccess(data.user);
            } else {
                await apiRequest('/users/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password })
                });

                setMessage('Registration successful! Please login.');
                setIsLogin(true);
                setPassword('');
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="game-card auth-card">
            <div className="apple">🍎</div>

            <p className="eyebrow">APPLE WORM ADVENTURE</p>

            <h1>
                {isLogin ? 'Welcome Back!' : 'Create Account'}
            </h1>

            <p className="subtitle">
                {isLogin
                    ? 'Login to continue your adventure.'
                    : 'Register and start your adventure!'}
            </p>

            <form onSubmit={handleSubmit} className="auth-form">

                {!isLogin && (
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                )}

                <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button
                    type="submit"
                    className="play-button"
                    disabled={loading}
                >
                    {loading
                        ? 'Please wait...'
                        : isLogin
                            ? 'Login'
                            : 'Register'}
                </button>
            </form>

            {message && (
                <p className="subtitle">{message}</p>
            )}

            <p className="auth-switch">
                {isLogin
                    ? "Don't have an account?"
                    : 'Already have an account?'}

                <button
                    type="button"
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setMessage('');
                    }}
                >
                    {isLogin ? ' Register' : ' Login'}
                </button>
            </p>
        </section>
    );
}

export default Auth;

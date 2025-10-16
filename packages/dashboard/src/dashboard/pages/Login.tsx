import {FunctionComponent, h} from 'preact';
import {useState} from 'preact/hooks';
import {useLocation} from 'preact-iso';
import {useUser} from '../../context/UserContext';

const Login: FunctionComponent = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const {login, error} = useUser();
    const location = useLocation();

    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        if (!username || !password) {
            return;
        }

        setIsLoggingIn(true);

        try {
            const success = await login(username, password);

            if (success) {
                location.route('/api/next-blog/dashboard');
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="username" className="block mb-1 font-medium">
                        Username
                    </label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername((e.target as HTMLInputElement).value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoggingIn}
                        required
                    />
                </div>

                <div className="mb-6">
                    <label htmlFor="password" className="block mb-1 font-medium">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoggingIn}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-blue-500 text-white font-medium rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    disabled={isLoggingIn}
                >
                    {isLoggingIn ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

export default Login;
import {FunctionComponent} from 'preact';
import {useUser} from "../../context/UserContext.tsx";
import {useLocation} from "preact-iso";

export const UserMenu: FunctionComponent = () => {
    const location = useLocation();
    const {user, logout} = useUser();

    const onLogout = async () => {
        await logout();
        location.route('/api/next-blog/dashboard');
    };

    if (!user) return null;

    return (
        <div className="dropdown dropdown-end dropdown-hover">
            {/* trigger */}
            <div
                tabIndex={0}
                className="flex items-center gap-1 px-2 py-1 pb-2 rounded-md cursor-pointer hover:bg-white transition-colors"
            >
                <span className="text-sm font-medium">{user.name}</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 opacity-60"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
            </div>

            {/* menu (no margin to avoid hover gap) */}
            <ul
                tabIndex={0}
                className="dropdown-content bg-white rounded-lg shadow p-2 w-40"
            >
                {user.permissions.includes('all:all') && (
                    <li className="text-sm px-3 py-2 opacity-70 select-none rounded-md">
                        Admin
                    </li>
                )}
                <li>
                    <div
                        onClick={onLogout}
                        className="text-sm px-3 py-2 rounded-md hover:bg-white cursor-pointer"
                    >
                        Logout
                    </div>
                </li>
            </ul>
        </div>
    );
};

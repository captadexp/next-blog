import {h} from 'preact';

interface LoaderProps {
    text?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const Loader = ({text = 'Loading...', size = 'md', className = ''}: LoaderProps) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8'
    };

    return (
        <div className={`flex items-center justify-center gap-2 ${className}`}>
            <div className={`${sizeClasses[size]} animate-spin border-2 border-gray-300 border-t-blue-500 rounded-full`} />
            {text && <span className="text-gray-600">{text}</span>}
        </div>
    );
};

export default Loader;
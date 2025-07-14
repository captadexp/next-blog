import React from 'react';
import { DatabaseAdapter, DetailedBlog } from '@supergrowthai/next-blog';

interface AuthorInfoProps {
    db: DatabaseAdapter;
    blog: DetailedBlog;
}

export const AuthorInfo: React.FC<AuthorInfoProps> = ({ blog }) => {
    const { author } = blog;
    return (
        <div className="bg-white p-6 rounded-lg shadow flex items-center">
            {/* Placeholder for author image */}
            <div className="w-16 h-16 bg-gray-300 rounded-full mr-4"></div>
            <div>
                <h4 className="text-lg font-bold">{author.name}</h4>
                <p className="text-gray-600">{author.bio}</p>
            </div>
        </div>
    );
};

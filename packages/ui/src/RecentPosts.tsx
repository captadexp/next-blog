"use client";
import React from 'react';
import { DatabaseAdapter, DetailedBlog } from '@supergrowthai/next-blog';

interface RecentPostsProps {
    db: DatabaseAdapter;
    blog: DetailedBlog;
}

export const RecentPosts: React.FC<RecentPostsProps> = ({ db }) => {
    // In a real app, you'd fetch recent posts from the db
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Recent Posts</h3>
            <ul>
                {/* Placeholder content */}
                <li className="mb-2"><a href="#" className="text-blue-600 hover:underline">Recent Post 1</a></li>
                <li className="mb-2"><a href="#" className="text-blue-600 hover:underline">Recent Post 2</a></li>
                <li className="mb-2"><a href="#" className="text-blue-600 hover:underline">Recent Post 3</a></li>
            </ul>
        </div>
    );
};

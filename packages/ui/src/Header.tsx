"use client";
import React from 'react';
import { DatabaseAdapter, DetailedBlog } from '@supergrowthai/next-blog';

interface HeaderProps {
    db: DatabaseAdapter;
    blog: DetailedBlog;
}

export const Header: React.FC<HeaderProps> = ({ blog }) => {
    return (
        <header className="bg-white shadow">
            <div className="max-w-6xl mx-auto px-4 py-6">
                <h1 className="text-4xl font-bold text-gray-900">{blog.title}</h1>
                <p className="mt-2 text-lg text-gray-600">{blog.excerpt}</p>
            </div>
        </header>
    );
};

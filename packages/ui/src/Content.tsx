"use client";
import React from 'react';
import { DatabaseAdapter, DetailedBlog } from '@supergrowthai/next-blog';

interface ContentProps {
    db: DatabaseAdapter;
    blog: DetailedBlog;
}

export const Content: React.FC<ContentProps> = ({ blog }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: blog.content }} />
        </div>
    );
};

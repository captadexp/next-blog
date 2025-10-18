'use client';

import {Pagination} from '@supergrowthai/next-blog-ui';
import {useState} from 'react';

export default function PaginationTestPage() {
    const [currentPage1, setCurrentPage1] = useState(1);
    const [currentPage2, setCurrentPage2] = useState(5);
    const [currentPage3, setCurrentPage3] = useState(1);
    const [currentPage4, setCurrentPage4] = useState(10);

    return (
        <div style={{padding: '40px'}}>
            <h1 style={{marginBottom: '40px'}}>Pagination Component Test</h1>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Default Pagination (Page {currentPage1} of 10)</h2>
                <Pagination
                    currentPage={currentPage1}
                    totalPages={10}
                    onPageChange={setCurrentPage1}
                />
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Middle Page (Page {currentPage2} of 20)</h2>
                <Pagination
                    currentPage={currentPage2}
                    totalPages={20}
                    onPageChange={setCurrentPage2}
                />
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Without First/Last Buttons</h2>
                <Pagination
                    currentPage={currentPage3}
                    totalPages={5}
                    onPageChange={setCurrentPage3}
                    showFirstLast={false}
                />
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Without Prev/Next Buttons</h2>
                <Pagination
                    currentPage={currentPage4}
                    totalPages={15}
                    onPageChange={setCurrentPage4}
                    showPrevNext={false}
                />
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Max 3 Visible Pages</h2>
                <Pagination
                    currentPage={5}
                    totalPages={10}
                    onPageChange={() => {
                    }}
                    maxVisiblePages={3}
                />
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Custom Styles</h2>
                <Pagination
                    currentPage={2}
                    totalPages={5}
                    onPageChange={() => {
                    }}
                    buttonStyle={{
                        backgroundColor: '#fef3c7',
                        borderColor: '#fbbf24',
                        color: '#78350f'
                    }}
                    activeButtonStyle={{
                        backgroundColor: '#f59e0b',
                        borderColor: '#f59e0b',
                        color: 'white'
                    }}
                />
            </div>

            <div style={{marginBottom: '40px'}}>
                <h2 style={{marginBottom: '20px'}}>Single Page (No pagination needed)</h2>
                <Pagination
                    currentPage={1}
                    totalPages={1}
                    onPageChange={() => {
                    }}
                />
            </div>
        </div>
    );
}
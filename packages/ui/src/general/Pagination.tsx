'use client';

import React from 'react';

interface PaginationProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    showFirstLast?: boolean;
    showPrevNext?: boolean;
    maxVisiblePages?: number;
    style?: React.CSSProperties;
    buttonStyle?: React.CSSProperties;
    activeButtonStyle?: React.CSSProperties;
    disabledButtonStyle?: React.CSSProperties;
}

export const Pagination: React.FC<PaginationProps> = ({
                                                          currentPage,
                                                          totalPages,
                                                          onPageChange,
                                                          showFirstLast = true,
                                                          showPrevNext = true,
                                                          maxVisiblePages = 5,
                                                          style,
                                                          buttonStyle,
                                                          activeButtonStyle,
                                                          disabledButtonStyle,
                                                          className,
                                                          ...rest
                                                      }) => {
    const getPageNumbers = (): number[] => {
        const pages: number[] = [];
        const half = Math.floor(maxVisiblePages / 2);
        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, currentPage + half);

        // Adjust if we're near the beginning or end
        if (currentPage <= half) {
            end = Math.min(totalPages, maxVisiblePages);
        }
        if (currentPage > totalPages - half) {
            start = Math.max(1, totalPages - maxVisiblePages + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    const containerStyles: React.CSSProperties = {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 0',
        ...style
    };

    const defaultButtonStyles: React.CSSProperties = {
        padding: '8px 12px',
        minWidth: '40px',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        color: '#374151',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'center',
        ...buttonStyle
    };

    const defaultActiveButtonStyles: React.CSSProperties = {
        ...defaultButtonStyles,
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
        color: 'white',
        ...activeButtonStyle
    };

    const defaultDisabledButtonStyles: React.CSSProperties = {
        ...defaultButtonStyles,
        cursor: 'not-allowed',
        opacity: 0.5,
        backgroundColor: '#f9fafb',
        ...disabledButtonStyle
    };

    const handleButtonClick = (page: number) => {
        if (page !== currentPage && page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    const pageNumbers = getPageNumbers();
    const showStartEllipsis = pageNumbers[0] > 1;
    const showEndEllipsis = pageNumbers[pageNumbers.length - 1] < totalPages;

    return (
        <div style={containerStyles} className={className} {...rest}>
            {showFirstLast && (
                <button
                    style={currentPage === 1 ? defaultDisabledButtonStyles : defaultButtonStyles}
                    onClick={() => handleButtonClick(1)}
                    disabled={currentPage === 1}
                    aria-label="First page"
                >
                    First
                </button>
            )}

            {showPrevNext && (
                <button
                    style={currentPage === 1 ? defaultDisabledButtonStyles : defaultButtonStyles}
                    onClick={() => handleButtonClick(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                >
                    ←
                </button>
            )}

            {showStartEllipsis && (
                <>
                    <button
                        style={defaultButtonStyles}
                        onClick={() => handleButtonClick(1)}
                    >
                        1
                    </button>
                    <span style={{color: '#9ca3af', padding: '0 4px'}}>...</span>
                </>
            )}

            {pageNumbers.map(page => (
                <button
                    key={page}
                    style={page === currentPage ? defaultActiveButtonStyles : defaultButtonStyles}
                    onClick={() => handleButtonClick(page)}
                    aria-label={`Go to page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                    onMouseEnter={(e) => {
                        if (page !== currentPage) {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#d1d5db';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (page !== currentPage) {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                    }}
                >
                    {page}
                </button>
            ))}

            {showEndEllipsis && (
                <>
                    <span style={{color: '#9ca3af', padding: '0 4px'}}>...</span>
                    <button
                        style={defaultButtonStyles}
                        onClick={() => handleButtonClick(totalPages)}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            {showPrevNext && (
                <button
                    style={currentPage === totalPages ? defaultDisabledButtonStyles : defaultButtonStyles}
                    onClick={() => handleButtonClick(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                >
                    →
                </button>
            )}

            {showFirstLast && (
                <button
                    style={currentPage === totalPages ? defaultDisabledButtonStyles : defaultButtonStyles}
                    onClick={() => handleButtonClick(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Last page"
                >
                    Last
                </button>
            )}
        </div>
    );
};
import React from 'react';

interface CanonicalProps {
    url: string;
    hrefLang?: string;
    alternates?: Array<{
        hrefLang: string;
        href: string;
    }>;
}

export const Canonical: React.FC<CanonicalProps> = ({
                                                        url,
                                                        hrefLang = 'en',
                                                        alternates = []
                                                    }) => {
    return (
        <>
            <link rel="canonical" href={url}/>
            <link rel="alternate" href={url} hrefLang={hrefLang}/>
            {alternates.map((alt, index) => (
                <link
                    key={index}
                    rel="alternate"
                    href={alt.href}
                    hrefLang={alt.hrefLang}
                />
            ))}
        </>
    );
};
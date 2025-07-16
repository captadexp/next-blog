import React from 'react';
import styles from './Layouts.module.css';

// --- Slot Components ---

const Header: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};

const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <main className={styles.main}>{children}</main>;
};

const Footer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};


// --- Main Layout Component ---

interface BlogLayoutComposition {
    Header: typeof Header;
    Body: typeof Body;
    Footer: typeof Footer;
}

export const BlogLayout: React.FC<{ children: React.ReactNode }> & BlogLayoutComposition = ({ children }) => {
    // Extract slots from children
    const header = React.Children.toArray(children).find(child => (child as React.ReactElement).type === Header);
    const body = React.Children.toArray(children).find(child => (child as React.ReactElement).type === Body);
    const footer = React.Children.toArray(children).find(child => (child as React.ReactElement).type === Footer);

    return (
        <div className={styles.page}>
            {header}
            {body}
            {footer}
        </div>
    );
};

BlogLayout.Header = Header;
BlogLayout.Body = Body;
BlogLayout.Footer = Footer;

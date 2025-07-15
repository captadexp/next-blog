import React from 'react';
import styles from './Layouts.module.css';

export const MainSection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <section className={styles.section}>{children}</section>;
};

import React from 'react';
import styles from './Layouts.module.css';

export const Aside: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <aside className={styles.aside}>{children}</aside>;
};

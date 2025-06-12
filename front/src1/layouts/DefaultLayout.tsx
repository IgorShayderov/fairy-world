import type { ReactNode } from 'react';

import styles from './DefaultLayout.module.scss';

interface IProps {
  children?: ReactNode;
}

const DefaultLayout = ({ children }: IProps) => {
  return <div className={styles.layout}>{children}</div>;
};

export default DefaultLayout;

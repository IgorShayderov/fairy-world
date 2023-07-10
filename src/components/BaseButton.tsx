import cn from 'classnames';

import type { ReactNode, ButtonHTMLAttributes } from 'react';

import styles from './BaseButton.module.scss';

interface IProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  isValid?: boolean;
  children?: ReactNode;
  attrs?: object;
}

const BaseButton = (props: IProps) => {
  const { text, isValid, children, attrs } = props;

  const buttonClasses = cn(styles.btn, {
    [styles.btn_disabled]: !isValid,
  });

  return (
    <button className={buttonClasses} {...attrs}>
      {children || text}
    </button>
  );
};

export default BaseButton;

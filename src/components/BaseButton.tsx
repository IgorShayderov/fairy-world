import cn from 'classnames';

import styles from './BaseButton.module.scss';

interface IProps {
  text?: string;
  isValid?: boolean;
}

const BaseButton = (props: IProps) => {
  const { text, isValid } = props;

  const buttonClasses = cn(styles.btn, {
    [styles.btn_disabled]: !isValid,
  });

  return <button className={buttonClasses}>{text}</button>;
};

export default BaseButton;

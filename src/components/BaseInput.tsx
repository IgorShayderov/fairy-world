import { useRef } from 'react';
import cn from 'classnames';

import type { ReactNode, InputHTMLAttributes } from 'react';

import styles from './BaseInput.module.scss';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  labelText?: string;
  value: string;
  isValid?: boolean;
  errors?: string[];
  inputCallback?: (event: Event) => void;
  changeCallback?: (event: Event) => void;
  children?: ReactNode;
  className?: string;
  attrs?: object;
}

const BaseInput = (props: IProps) => {
  const {
    id,
    value,
    labelText = '',
    errors = [],
    isValid = true,
    onInput,
    onChange,
    children,
    className = '',
    ...attrs
  } = props;
  const isTouched = useRef(false);

  const inputClasses = cn(styles.input, className, {
    [styles.input_valid]: isTouched.current && isValid,
    [styles.input_invalid]: isTouched.current && !isValid,
  });

  const shouldBeVisible = isTouched.current && errors.length > 0 && !isValid;
  const errorMessagesClasses = cn(styles['error-message'], {
    [styles['error-message_visible']]: shouldBeVisible,
  });

  const handleInput = () => (event: Event) => {
    isTouched.current = false;

    if (onInput !== undefined) {
      onInput(event);
    }
  };

  const handleChange = () => (event: Event) => {
    isTouched.current = Boolean(value);

    if (onChange !== undefined) {
      onChange(event);
    }
  };

  return (
    <>
      <label htmlFor={id} className={styles.label}>
        {children || labelText}
        <input
          id={id}
          aria-describedby={`${id}-errorMessages`}
          value={value}
          className={inputClasses}
          onInput={handleInput}
          onChange={handleChange}
          {...attrs}
        />
      </label>

      <p id={`${id}-errorMessages`} className={errorMessagesClasses}>
        {errors.join(', ')}
      </p>
    </>
  );
};

export default BaseInput;

import { useRef } from 'react';
import cn from 'classnames';

<<<<<<< HEAD:front/src/components/BaseInput.tsx
import type { ReactNode, InputHTMLAttributes, SyntheticEvent } from 'react';
=======
import type { ReactNode, InputHTMLAttributes } from 'react';
>>>>>>> 941c720 (Develop (#2)):src/components/BaseInput.tsx

import styles from './BaseInput.module.scss';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  labelText?: string;
  value: string;
  isValid?: boolean;
  errors?: string[];
<<<<<<< HEAD:front/src/components/BaseInput.tsx
  changeCallback?: (event: SyntheticEvent) => void;
  children?: ReactNode;
  className?: string;
=======
  inputCallback?: (event: Event) => void;
  changeCallback?: (event: Event) => void;
  children?: ReactNode;
>>>>>>> 941c720 (Develop (#2)):src/components/BaseInput.tsx
  attrs?: object;
}

const BaseInput = (props: IProps) => {
  const {
    id,
    value,
    labelText = '',
    errors = [],
    isValid = true,
    changeCallback,
    children,
<<<<<<< HEAD:front/src/components/BaseInput.tsx
    className = '',
=======
>>>>>>> 941c720 (Develop (#2)):src/components/BaseInput.tsx
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

  const handleChange = (event: SyntheticEvent) => {
    isTouched.current = Boolean(value);

    if (changeCallback !== undefined) {
      changeCallback(event);
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
<<<<<<< HEAD:front/src/components/BaseInput.tsx
=======
          onInput={handleInput}
>>>>>>> 941c720 (Develop (#2)):src/components/BaseInput.tsx
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

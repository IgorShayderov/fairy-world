import { useRef } from 'react';
import cn from 'classnames';

import styles from './BaseInput.module.scss';

interface IProps {
  id: string;
  labelText?: string;
  value: string;
  isValid?: boolean;
  errors?: string[];
  inputCallback?: (event: Event) => void;
  changeCallback?: (event: Event) => void;
}

const BaseInput = (props: IProps) => {
  const {
    id,
    value,
    labelText = '',
    errors = [],
    isValid = true,
    inputCallback,
    changeCallback,
  } = props;
  const isTouched = useRef(false);

  const inputClasses = cn(styles.input, {
    [styles.input_valid]: isTouched.current && isValid,
    [styles.input_invalid]: isTouched.current && !isValid,
  });

  const shouldBeVisible = isTouched.current && errors.length > 0 && !isValid;
  const errorMessagesClasses = cn(styles['error-message'], {
    [styles['error-message_visible']]: shouldBeVisible,
  });

  const handleInput = () => (event: Event) => {
    isTouched.current = false;

    if (inputCallback !== undefined) {
      inputCallback(event);
    }
  };

  const handleChange = () => (event: Event) => {
    isTouched.current = Boolean(value);

    if (changeCallback !== undefined) {
      changeCallback(event);
    }
  };

  return (
    <template>
      <>
        <label htmlFor={id} className={styles.label}>
          {labelText}
          <input
            id={id}
            aria-describedby={`${id}-errorMessages`}
            value={value}
            className={inputClasses}
            onInput={handleInput}
            onChange={handleChange}
          />
        </label>

        <p id={`${id}-errorMessages`} className={errorMessagesClasses}>
          {errors.join(', ')}
        </p>
      </>
    </template>
  );
};

export default BaseInput;
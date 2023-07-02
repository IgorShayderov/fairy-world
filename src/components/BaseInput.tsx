import { useRef } from 'react';
import cn from 'classnames';

import styles from 'BaseInput.module.scss';

interface IProps {
  id: string;
  labelText?: string;
  value: string;
  isValid?: boolean;
  errors?: string[];
}

const BaseInput = (props: IProps) => {
  const { id, value, labelText = '', errors = [], isValid } = props;
  const isTouched = useRef(false);

  const inputClasses = cn(styles.input, {
    [styles.input_valid]: isTouched.current && isValid,
    [styles.input_invalid]: isTouched.current && !isValid,
  });

  const shouldBeVisible = isTouched.current && errors.length > 0 && !isValid;
  const errorMessagesClasses = cn(styles['error-message'], {
    [styles['error-message_visible']]: shouldBeVisible,

  });

  const handleInput = () => {
    isTouched.current = false;
  };

  const handleChange = () => {
    isTouched.current = Boolean(value);
  };

  return (
    <template>
      <>
        <label
          htmlFor={id}
          className={styles.label}
        >
          { labelText }
          <input
            id={id}
            aria-describedby={`${id}-errorMessages`}
            value={value}
            className={inputClasses}
            onInput={handleInput}
            onChange={handleChange}
          />
        </label>

        <p
          id={`${id}-errorMessages`}
          className={errorMessagesClasses}
        >
          { errors.join(', ') }
        </p>
      </>
    </template>
  );
};

export default BaseInput;

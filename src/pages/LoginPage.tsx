import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

import BaseInput from '@components/BaseInput';
import BaseButton from '@components/BaseButton';

import useAuth from '@hooks/useAuth';

import styles from './LoginPage.module.scss';

const LoginPage = () => {
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordInputType, setPasswordInputType] = useState('');

  const isLoading = useRef(false);

  const emailRegex = /^\S+@\S+\.\S+$/;
  const isEmailValid = () => email.trim().match(emailRegex) !== null;
  const passwordRegex =
    /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
  const isPasswordValid = () => password.trim().match(passwordRegex) !== null;
  const isFormValid = () => {
    const areFieldsValid = isPasswordValid() && isEmailValid();

    return areFieldsValid && !isLoading.current;
  };

  const emailErrors = {
    'Invalid email': isEmailValid(),
  };
  const passwordErrors = {
    'Invalid password': isPasswordValid(),
  };
  const getErrors = (errors = {}) => {
    return Object.entries(errors).reduce(
      (messages: string[], [errorMessage, condition]) => {
        if (!condition) {
          messages.push(errorMessage);
        }

        return messages;
      },
      []
    );
  };
  const getEmailErrors = () => getErrors(emailErrors);
  const getPasswordErrors = () => getErrors(passwordErrors);

  const togglePasswordInputType = () => {
    const newInputType = passwordInputType === 'password' ? 'text' : 'password';

    setPasswordInputType(newInputType);
  };

  const passwordInputClasses = cn(styles.input, styles['password-input']);

  const passwordBtnClasses = cn(styles['show-password-btn'], {
    [styles['show-password-btn_password-visible']]:
      passwordInputType === 'text',
  });

  const handleEmailInput = () => (event: Event) => {
    //
    console.log(event, '??');
  };

  const handleSubmit = () => async (event: Event) => {
    event.preventDefault();

    if (isFormValid()) {
      await signIn({ email, password });

      alert('Successfully authenticated!');
    }
  };

  return (
    <div className={styles.example}>
      <h1>{t('pages.loginPage.title')}</h1>

      <form onSubmit={handleSubmit}>
        <BaseInput
          value={email}
          id="email"
          autoComplete="email"
          type="email"
          name="email"
          maxLength={60}
          minLength={5}
          placeholder="Type your email"
          required
          pattern={emailRegex.toString().replaceAll('/', '')}
          isValid={isEmailValid()}
          className={styles.input}
          errors={getEmailErrors()}
          onInput={handleEmailInput}
        >
          Email:
        </BaseInput>

        <BaseInput
          id="password"
          autoComplete="current-password"
          value={password}
          type={passwordInputType}
          name="password"
          maxLength={16}
          minLength={6}
          placeholder="Type your password"
          required
          pattern={passwordRegex.toString().replaceAll('/', '')}
          isValid={isPasswordValid()}
          className={passwordInputClasses}
          errors={getPasswordErrors()}
        >
          Password:
          <BaseButton
            className={passwordBtnClasses}
            aria-label="toggle-password"
            onClick={togglePasswordInputType}
          />
        </BaseInput>

        <BaseButton type="submit" className={styles['submit-btn']}>
          Sign in
        </BaseButton>
      </form>
    </div>
  );
};

export default LoginPage;

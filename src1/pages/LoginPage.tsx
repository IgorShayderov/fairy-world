import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';

import type { SyntheticEvent } from 'react';

import BaseInput from '@components/BaseInput';
import BaseButton from '@components/BaseButton';

import { useAuth } from '@hooks/useAuth';

import styles from './LoginPage.module.scss';
import routes from '@/routes';

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordInputType, setPasswordInputType] = useState<
    'password' | 'text'
  >('password');

  const isLoading = useRef(false);

  const emailRegex = /^\S+@\S+\.\S+$/;
  const isEmailValid = () => email.trim().match(emailRegex) !== null;
  // FIXME
  // const passwordRegex =
  //   /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
  // const isPasswordValid = () => password.trim().match(passwordRegex) !== null;
  const isPasswordValid = () => password.trim().length > 0;
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

  const togglePasswordInputType = (event: SyntheticEvent) => {
    event.stopPropagation();

    const newInputType = passwordInputType === 'password' ? 'text' : 'password';

    setPasswordInputType(newInputType);
  };

  const passwordInputClasses = cn(styles.input, styles['password-input']);

  const passwordBtnClasses = cn(styles['show-password-btn'], {
    [styles['show-password-btn_password-visible']]:
      passwordInputType === 'text',
  });

  const handleEmailInput = (event: SyntheticEvent) => {
    setEmail((event.target as HTMLInputElement).value);
  };

  const handlePasswordInput = (event: SyntheticEvent) => {
    setPassword((event.target as HTMLInputElement).value);
  };

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();

    try {
      if (isFormValid()) {
        await signIn({ email, password });
        navigate(routes.rootPagePath());
        toast.success(t('pages.loginPage.messages.auth.success'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('pages.loginPage.messages.auth.failure'));
    }
  };

  return (
    <div className={styles['form-wrapper']}>
      <h1 className={styles.title}>{t('pages.loginPage.title')}</h1>
      <form className={styles['form']} onSubmit={handleSubmit}>
        <BaseInput
          value={email}
          id="email"
          autoComplete="email"
          type="email"
          name="email"
          className={styles.input}
          placeholder={t('pages.loginPage.form.email.placeholder')}
          required
          pattern={emailRegex.toString().replaceAll('/', '')}
          isValid={isEmailValid()}
          errors={getEmailErrors()}
          changeCallback={handleEmailInput}
        >
          {t('pages.loginPage.form.email.label')}:
        </BaseInput>

        <BaseInput
          id="password"
          autoComplete="current-password"
          value={password}
          type={passwordInputType}
          name="password"
          maxLength={16}
          minLength={6}
          placeholder={t('pages.loginPage.form.password.placeholder')}
          required
          isValid={isPasswordValid()}
          className={passwordInputClasses}
          errors={getPasswordErrors()}
          changeCallback={handlePasswordInput}
        >
          {t('pages.loginPage.form.password.label')}:
          <BaseButton
            className={passwordBtnClasses}
            aria-label="toggle-password"
            type="button"
            onClick={togglePasswordInputType}
          />
        </BaseInput>

        <BaseButton type="submit" className={styles['submit-btn']}>
          {t('pages.loginPage.form.submitBtn.label')}
        </BaseButton>
      </form>
    </div>
  );
};

export default LoginPage;

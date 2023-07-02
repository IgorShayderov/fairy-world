import { useTranslation } from 'react-i18next';

import styles from './LoginPage.module.scss';

const LoginPage = () => {
  const { t } = useTranslation();

  const handleSubmit = () => {
    //
  };

  return (
    <div className={styles.example}>
      <h1>{t('pages.loginPage.title')}</h1>

      <form onSubmit={handleSubmit}></form>
    </div>
  );
};

export default LoginPage;

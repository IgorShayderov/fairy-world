import { useTranslation } from 'react-i18next';

import styles from './LoginPage.module.scss';

const LoginPage = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.example}>
      <h2>{ t('pages.loginPage.title') }</h2>
    </div>
  );
};

export default LoginPage;

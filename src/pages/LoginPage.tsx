import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h2>{ t('pages.loginPage.title') }</h2>
    </div>
  );
};

export default LoginPage;

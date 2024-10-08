import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

const RootPage = () => {
  const { t } = useTranslation();

  return (
    <main>
      Root
      <Button type="primary">{t('pages.root.buttons.logout')}</Button>
    </main>
  );
};

export default RootPage;

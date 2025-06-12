import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginPage from './pages/LoginPage';
import RootPage from './pages/RootPage';
import NotFoundPage from './pages/NotFoundPage';
import DefaultLayout from './layouts/DefaultLayout';

import useAuth from './hooks/useAuth';
import routes from './routes';

const PrivateOutlet = () => {
    // сделать запрос на получение пользователя

  const { currentUser } = useAuth();

  return currentUser ? <Outlet /> : <Navigate to={routes.loginPagePath()} />;
};

const App = () => {
  return (
    <DefaultLayout>
      <BrowserRouter>
        <Routes>
          <Route path={routes.loginPagePath()} element={<LoginPage />} />
          <Route path={routes.rootPagePath()} element={<PrivateOutlet />}>
            <Route path="" element={<RootPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>

      <ToastContainer />
    </DefaultLayout>
  );
};

export default App;

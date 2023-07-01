import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

import useAuth from './hooks/useAuth';
import routes from './routes';

const PrivateOutlet = () => {
  const { currentUser } = useAuth();

  return currentUser ? <Outlet /> : <Navigate to={routes.loginPagePath()} />;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={routes.loginPagePath()} element={<LoginPage />} />
        <Route path={routes.rootPagePath()} element={<PrivateOutlet />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
